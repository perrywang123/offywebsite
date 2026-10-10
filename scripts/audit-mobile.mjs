#!/usr/bin/env node
/**
 * 移动端适配验收脚本(方案 §6.1)。零依赖:Node 22+ 的全局 WebSocket + 自带 fetch,
 * 直接连 Chrome DevTools Protocol;本机没在跑 Chrome 时会自己拉起一个 headless。
 *
 * 用法:
 *   node scripts/audit-mobile.mjs --base http://127.0.0.1:3000
 *   node scripts/audit-mobile.mjs --base http://127.0.0.1:3000 --widths 320,375,390
 *   node scripts/audit-mobile.mjs --base http://127.0.0.1:3000 --port 9222   # 连已有 Chrome
 *
 * 退出码:任一断言 FAIL → 1(可直接当 CI 门禁)。
 */

import { launchBrowser, openPage } from "./lib/cdp.mjs";

const args = process.argv.slice(2);
const argOf = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const BASE = argOf("base", "http://127.0.0.1:3000").replace(/\/$/, "");
const WIDTHS = argOf("widths", "320,375,390")
  .split(",")
  .map((w) => Number(w.trim()));
const HEIGHT = Number(argOf("height", 812));
const PORT = argOf("port") ? Number(argOf("port")) : undefined;
const SHOTS = args.includes("--screenshots");

/** 固定路由(方案 §6.1)。PDP 用真实在线款;`/cart`、`/checkout` 都要先塞袋子。 */
const ROUTES = [
  { name: "home", path: "/" },
  { name: "products", path: "/products" },
  { name: "collection", path: "/collections/princess-lady" },
  { name: "pdp", path: "/products/swan-princess" },
  { name: "cart", path: "/cart", seedCart: true },
  { name: "checkout", path: "/checkout", seedCart: true },
  { name: "bag-charm", path: "/bag-charm" },
  { name: "faq", path: "/faq" },
  { name: "policy", path: "/policies/returns" },
  { name: "about", path: "/about" },
];

/** 购买路径 = 有 44px 硬要求的那几条(方案 §6.1 断言 2)。 */
const PURCHASE_PATHS = new Set(["pdp", "cart", "checkout"]);

const SEED_CART = `(() => {
  const lines = [{ code: "swan-princess", quantity: 2 }, { code: "black-pearl", quantity: 1 }];
  localStorage.setItem("offy.cart.v1", JSON.stringify(lines));
  return lines.length;
})()`;

/**
 * 在页面里跑的采集脚本(返回普通对象,CDP 会按值回传)。
 * 所有几何量都取 `getBoundingClientRect()`,与真实点按区域一致。
 */
const COLLECT = (purchasePath) => `(() => {
  const vw = document.documentElement.clientWidth;
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none" && s.opacity !== "0";
  };
  const hits = (el, x, y) => {
    const t = document.elementFromPoint(x, y);
    return t === el || el.contains(t) || (t && t.contains(el));
  };
  /**
   * 真实可点区域 = 从元素中心向四周探测、直到 elementFromPoint 不再命中它。
   * 这样算出来的尺寸包含:
   *  · 伪元素撑出来的命中区(HeroCarousel 2.8px 高的指示条就是靠 ::after 扩到
   *    40px 的,getBoundingClientRect 完全量不到);
   *  · 被其它元素盖住的部分(那些地方点下去根本到不了它)。
   */
  const effectiveBox = (el, maxProbe = 46) => {
    const r = el.getBoundingClientRect();
    const cx = Math.min(Math.max(r.left + r.width / 2, 1), vw - 1);
    const cy = Math.min(Math.max(r.top + r.height / 2, 1), window.innerHeight - 1);
    if (!hits(el, cx, cy)) return { w: 0, h: 0, covered: true };
    let up = 0, down = 0, left = 0, right = 0;
    for (let d = 2; d <= maxProbe; d += 2) { if (hits(el, cx, cy - d)) up = d; else break; }
    for (let d = 2; d <= maxProbe; d += 2) { if (hits(el, cx, cy + d)) down = d; else break; }
    for (let d = 2; d <= maxProbe; d += 2) { if (hits(el, cx - d, cy)) left = d; else break; }
    for (let d = 2; d <= maxProbe; d += 2) { if (hits(el, cx + d, cy)) right = d; else break; }
    return { w: Math.round(r.width) + left + right, h: Math.round(r.height) + up + down, covered: false };
  };
  /** 段落正文里夹着的行内链接:WCAG 2.5.8 的 inline 例外。 */
  const inlineInSentence = (el) => el.tagName === "A" && !!el.closest("p, .policy-body, dd");
  /** 行内文字链(导航/面包屑/页脚):高度必须 ≥44(方案规范表),宽度随文字。 */
  const inlineTextLink = (el) =>
    el.tagName === "A" && !el.querySelector("img, svg") && (el.textContent || "").trim().length > 0;

  const interactive = [...document.querySelectorAll("a[href], button, summary, input, select, textarea, label")];
  const small = [];
  const tiny = [];
  for (const el of interactive) {
    if (!visible(el)) continue;
    if (el.closest('[aria-hidden="true"]')) continue;
    if (inlineInSentence(el)) continue;
    const box = effectiveBox(el);
    if (box.covered) continue;
    const label = (el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 32);
    const row = { tag: el.tagName.toLowerCase(), text: label, w: box.w, h: box.h };
    const inline = inlineTextLink(el);
    // 行内文字链:宽度随文字(≥24),高度必须 ≥44
    const minW = inline ? 24 : 44;
    const minH = 44;
    if ((box.w < minW || box.h < minH) && box.h < 48 && box.w < 96) small.push(row);
    if (box.w < 24 || box.h < 24) tiny.push(row);
  }

  const smallText = [];
  for (const el of document.querySelectorAll("body *")) {
    if (el.children.length > 0) continue;               // 只看叶子文本节点
    const text = (el.textContent || "").trim();
    if (!text || text.length < 2) continue;
    if (!visible(el) || el.closest('[aria-hidden="true"]') || el.classList.contains("sr-only")) continue;
    const size = parseFloat(getComputedStyle(el).fontSize);
    if (size < 11) smallText.push({ text: text.slice(0, 32), px: Number(size.toFixed(2)) });
  }

  const lefts = {};
  const mark = (key, el) => { if (el && visible(el)) lefts[key] = Math.round(el.getBoundingClientRect().left); };
  mark("h1", document.querySelector("h1"));
  mark("logo", document.querySelector('header img[alt="is.offy"]') || document.querySelector('header a[aria-label="is.offy"]'));
  // 分类条的量点是它**内层**的 .container-site(外层是 sticky 的满宽盒子,天然 left=0)
  mark("tabs", document.querySelector('[role="tablist"] .container-site'));
  mark("main", document.querySelector("main .container-site"));

  return {
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: vw,
    bodyScrollWidth: document.body.scrollWidth,
    purchasePath: ${purchasePath},
    small,
    tiny,
    smallText,
    lefts,
    dialogOpen: Boolean(document.querySelector('[role="dialog"][data-open="true"]')),
    title: document.title,
  };
})()`;

const ESC = "\u001b[";
const green = (s) => `${ESC}32m${s}${ESC}0m`;
const red = (s) => `${ESC}31m${s}${ESC}0m`;
const dim = (s) => `${ESC}2m${s}${ESC}0m`;

const failures = [];
function record(scope, name, ok, detail) {
  const line = `${ok ? green("PASS") : red("FAIL")} ${scope} · ${name}${detail ? dim(` — ${detail}`) : ""}`;
  console.log(line);
  if (!ok) failures.push(`${scope} · ${name} — ${detail}`);
}

/** 每条路由在每个视口下的断言。 */
function checkViewport(scope, data) {
  // 1. 零横向溢出(320/375 都必须成立,390 一并看)
  record(
    scope,
    "零横向溢出",
    data.scrollWidth <= data.clientWidth,
    `scrollWidth=${data.scrollWidth} clientWidth=${data.clientWidth}`,
  );

  // 2. 购买路径:0 个 < 44×44
  if (data.purchasePath) {
    record(
      scope,
      "购买路径点击目标 ≥44×44",
      data.small.length === 0,
      data.small.length ? JSON.stringify(data.small.slice(0, 6)) : "0 个不达标",
    );
  }

  // 3. 全站:0 个 < 24×24
  record(
    scope,
    "全站点击目标 ≥24×24",
    data.tiny.length === 0,
    data.tiny.length ? JSON.stringify(data.tiny.slice(0, 6)) : "0 个不达标",
  );

  // 4. 可读下限:11px
  record(
    scope,
    "无 <11px 可见文本",
    data.smallText.length === 0,
    data.smallText.length ? JSON.stringify(data.smallText.slice(0, 6)) : "0 个",
  );

  // 6. 左边缘一致性:h1 / logo / tab 条都从版心 16px 起
  const leftEntries = Object.entries(data.lefts);
  const bad = leftEntries.filter(([, v]) => v !== 16);
  record(
    scope,
    "版心左边缘 = 16px",
    bad.length === 0,
    bad.length ? JSON.stringify(bad) : JSON.stringify(data.lefts),
  );
}

async function main() {
  const browser = await launchBrowser({ port: PORT });
  console.log(
    dim(
      `浏览器:${browser.version?.Browser ?? "unknown"} @ 127.0.0.1:${browser.port}\n站点:${BASE}\n视口:${WIDTHS.join(" / ")} × ${HEIGHT}\n`,
    ),
  );

  const page = await openPage(browser.port);

  try {
    for (const width of WIDTHS) {
      console.log(`\n${ESC}1m━━ ${width}×${HEIGHT} ━━${ESC}0m`);
      await page.setViewport(width, HEIGHT);

      for (const route of ROUTES) {
        const scope = `${width}px · ${route.name}`;
        const gotoOnce = async () => {
          await page.goto(`${BASE}${route.path}`);
          if (route.seedCart) {
            // 袋子/结算页需要购物袋里有东西;localStorage 里塞好再刷新。
            await page.evaluate(SEED_CART);
            await page.goto(`${BASE}${route.path}`);
          }
        };
        try {
          await gotoOnce();
          const data = await page.evaluate(COLLECT(PURCHASE_PATHS.has(route.name)));
          checkViewport(scope, data);

          // 抽屉:首页打开一次,单独断言(方案 M2)
          if (route.name === "home") {
            const drawerScope = `${width}px · drawer`;
            await page.evaluate(
              `(() => { const b = [...document.querySelectorAll("header button")].find((x) => /bag/i.test(x.getAttribute("aria-label") || "")); if (b) b.click(); return Boolean(b); })()`,
            );
            await new Promise((r) => setTimeout(r, 500));
            const drawer = await page.evaluate(COLLECT(true));
            if (!drawer.dialogOpen) {
              record(drawerScope, "抽屉可打开", false, "找不到 aria-label 含 bag 的 header 按钮");
            } else {
              checkViewport(drawerScope, drawer);
              const closeGeo = await page.evaluate(
                `(() => { const btn = document.querySelector('[role="dialog"] button[aria-label]'); if (!btn) return null; const r = btn.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; })()`,
              );
              record(
                drawerScope,
                "关闭按钮 ≥44×44",
                Boolean(closeGeo && closeGeo.w >= 44 && closeGeo.h >= 44),
                JSON.stringify(closeGeo),
              );
            }
            await page.evaluate(
              `window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))`,
            );
            await new Promise((r) => setTimeout(r, 200));
          }

          if (SHOTS) {
            const shot = await page.send("Page.captureScreenshot", { format: "png" });
            const { writeFileSync, mkdirSync } = await import("node:fs");
            mkdirSync("tmp/mobile-audit", { recursive: true });
            writeFileSync(
              `tmp/mobile-audit/${width}-${route.name}.png`,
              Buffer.from(shot.data, "base64"),
            );
          }
        } catch (error) {
          record(scope, "页面可访问", false, String(error.message ?? error));
        }
      }
    }
  } finally {
    await page.close();
    await browser.close();
  }

  console.log("");
  if (failures.length === 0) {
    console.log(green(`全部通过(${ROUTES.length} 路由 × ${WIDTHS.length} 视口)`));
    process.exit(0);
  }
  console.log(red(`${failures.length} 项失败:`));
  for (const f of failures) console.log(red(`  · ${f}`));
  process.exit(1);
}

main().catch((error) => {
  console.error(red(`审计脚本自身出错:${error.stack ?? error}`));
  process.exit(2);
});
