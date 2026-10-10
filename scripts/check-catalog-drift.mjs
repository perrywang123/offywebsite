#!/usr/bin/env node
/**
 * 本地兜底目录 vs 线上 Shopify 的漂移检查。
 *
 * 用途:站点的商品详情 URL 取 Shopify 的 handle(`toLiveProduct` 里 `code = item.handle`),
 * 所以实时模式下天然同步。但 **Shopify 不可达时会回退到 `src/lib/catalog/products.ts`
 * 的本地表** —— 那张表是手写快照,会随时间腐化:商品名对不上、系列归属错、
 * 甚至 URL 指向一个已经不存在的 handle。这个脚本把差异直接打出来。
 *
 * 用法:node scripts/check-catalog-drift.mjs   (或 pnpm check:catalog)
 * 退出码:0 = 无漂移;1 = 有漂移(可用于 CI / 部署前检查)。
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv() {
  const env = {};
  for (const file of [".env", ".env.local"]) {
    try {
      for (const line of readFileSync(resolve(root, file), "utf8").split("\n")) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
        if (m && !(m[1] in env)) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    } catch {
      /* 文件不存在就用 process.env */
    }
  }
  return { ...process.env, ...env };
}

const env = loadEnv();
if (!env.SHOPIFY_STORE_DOMAIN || !env.SHOPIFY_STOREFRONT_TOKEN) {
  console.error("缺少 SHOPIFY_STORE_DOMAIN / SHOPIFY_STOREFRONT_TOKEN,无法比对。");
  process.exit(2);
}

const gql = async (query) => {
  const res = await fetch(`https://${env.SHOPIFY_STORE_DOMAIN}/api/${env.SHOPIFY_API_VERSION || "2026-07"}/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Storefront-Access-Token": env.SHOPIFY_STOREFRONT_TOKEN },
    body: JSON.stringify({ query }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors).slice(0, 300));
  return json.data;
};

// 线上:handle → {title, collections}
// 必须带市场上下文:不带时走店铺默认市场,会把「仅 GB/仅 HK」这类区域限定款
// 也算进来,与本地兜底表(按 US 市场构建)不可比,报出来的都是噪音。
const data = await gql(`query @inContext(country: US) {
  products(first: 100) { nodes { handle title collections(first: 5) { nodes { handle } } } }
  collections(first: 20) { nodes { handle title } }
}`);
const live = new Map(
  data.products.nodes.map((n) => [n.handle, { title: n.title, collections: n.collections.nodes.map((c) => c.handle) }]),
);

// 本地:从 products.ts 里抓 sp("handle", "series", "中文名", "英文名", ...)
const src = readFileSync(resolve(root, "src/lib/catalog/products.ts"), "utf8");
const local = [...src.matchAll(/sp\(\s*"([^"]+)"\s*,\s*"([^"]+)"\s*,\s*"([^"]*)"\s*,\s*"([^"]*)"/g)].map(
  ([, handle, series, zh, en]) => ({ handle, series, zh, en }),
);

const problems = [];

const missing = local.filter((p) => !live.has(p.handle));
if (missing.length) {
  problems.push(
    `本地有、线上没有的 handle(${missing.length} 个)—— 这些 URL 在实时模式下会 404:\n` +
      missing.map((p) => `    · ${p.handle} (${p.en})`).join("\n"),
  );
}

const nameDrift = local.filter((p) => live.has(p.handle) && live.get(p.handle).title && live.get(p.handle).title !== p.en);
if (nameDrift.length) {
  problems.push(
    `商品名与线上不一致(${nameDrift.length} 个)—— 回退模式下会显示成旧名字:\n` +
      nameDrift.map((p) => `    · ${p.handle}: 本地 "${p.en}"  vs 线上 "${live.get(p.handle).title}"`).join("\n"),
  );
}

// 本地兜底表是按 **US 市场 + 按系列列出** 的,所以有两类商品"合理地"不在表里,
// 不该报成漂移,否则每次跑都有一堆噪音、真正的漂移会被淹没:
//   · 区域限定款(如 noir 仅 GB、boots 仅 HK):US 市场看不到
//   · 不属于任何 collection 的(如 offy-sticker-sheet):实时路径按 collection 遍历,本来就不列
const notOnLive = [...live.keys()].filter((h) => !local.some((p) => p.handle === h));
const expectedAbsent = notOnLive.filter((h) => (live.get(h).collections ?? []).length === 0);
const realDrift = notOnLive.filter((h) => !expectedAbsent.includes(h));
if (realDrift.length) {
  problems.push(
    `线上有、本地兜底表没有(${realDrift.length} 个)—— 回退模式下这些商品会整批消失:\n` +
      realDrift.map((h) => `    · ${h} (${live.get(h).title})`).join("\n"),
  );
}
if (expectedAbsent.length) {
  console.log(
    `\nℹ 线上有但本地表未收(预期,不算漂移):\n` +
      expectedAbsent.map((h) => `    · ${h} (${live.get(h).title}) — 无 collection,实时路径也不列`).join("\n"),
  );
}

// 系列归属:本地写死的 series 与线上 collection 的映射应当一致
const SERIES_OF_COLLECTION = { frontpage: "princess-lady", "outdoor-sporty系列": "outdoor-sporty", "趣味生活系列": "playful-life" };
const seriesDrift = local.filter((p) => {
  const cols = live.get(p.handle)?.collections ?? [];
  const expected = cols.map((c) => SERIES_OF_COLLECTION[c]).find(Boolean);
  return expected && expected !== p.series;
});
if (seriesDrift.length) {
  problems.push(
    `系列归属不一致(${seriesDrift.length} 个)—— 回退模式下商品会挂到错误的系列下:\n` +
      seriesDrift
        .map((p) => `    · ${p.handle}: 本地 "${p.series}"  vs 线上 "${
          (live.get(p.handle).collections.map((c) => SERIES_OF_COLLECTION[c]).find(Boolean)) || "?"
        }"`)
        .join("\n"),
  );
}

console.log(`线上商品 ${live.size} 个 / 本地兜底表 ${local.length} 个`);
console.log("注:兜底表按 US 市场构建,「仅 GB/仅 HK」这类区域限定款本就不该在里面。");
console.log(`线上系列: ${data.collections.nodes.map((c) => `${c.handle}(${c.title})`).join(", ")}`);

if (problems.length === 0) {
  console.log("\n✓ 本地兜底表与线上一致,无漂移。");
  process.exit(0);
}
console.log(`\n✗ 发现 ${problems.length} 类漂移:\n`);
for (const p of problems) console.log(`  ${p}\n`);
process.exit(1);
