/**
 * 服务启动钩子(Next.js instrumentation,standalone 产物里同样会执行一次)。
 *
 * 存在的理由:Shopify 凭据缺失时,应用**不会崩**,而是静默回退到本地兜底目录 ——
 * 现象是商品数不对、系列名变成 Princess Lady / Fashion Lifestyle 这类占位名、
 * 政策页显示"正文暂时无法加载"。这个降级在功能上是对的(不白屏),但**排查成本极高**:
 * 已经在真实部署上因此绕了两轮(容器看起来 healthy,网站也打得开)。
 * 所以启动时把配置缺口直接喊出来,而不是等人对着页面猜。
 */
export function register() {
  // 只在服务端跑;客户端 bundle 不该看到这些
  const missing: string[] = [];
  const check = (name: string, isSet: boolean) => {
    if (!isSet) missing.push(name);
  };

  check("SHOPIFY_STORE_DOMAIN", Boolean(process.env.SHOPIFY_STORE_DOMAIN?.trim()));
  check("SHOPIFY_STOREFRONT_TOKEN", Boolean(process.env.SHOPIFY_STOREFRONT_TOKEN?.trim()));
  check("SITE_URL", Boolean(process.env.SITE_URL?.trim()));

  if (missing.length === 0) return;

  console.error(
    [
      "",
      "════════════════════════════════════════════════════════════════════",
      "⚠️  配置缺失,应用会降级运行(fallback),不是崩溃但结果不对:",
      ...missing.map((m) => `      · ${m} 未设置`),
      "",
      "    影响:",
      "      · 缺 SHOPIFY_* → 商品目录整体回退本地兜底表(商品数偏少、",
      "        系列名变成本地占位名),所有政策页显示「正文暂时无法加载」",
      "      · 缺 SITE_URL  → sitemap / canonical 指向 localhost,",
      "        Stripe 与 PayPal 的结算回跳地址也会错",
      "",
      "    部署机上检查:docker compose -f docker-compose.prod.yml exec app env \\",
      "                    | grep -E 'SHOPIFY|SITE_URL'",
      "    该命令无输出,就是 .env 没送到容器里。",
      "════════════════════════════════════════════════════════════════════",
      "",
    ].join("\n"),
  );
}
