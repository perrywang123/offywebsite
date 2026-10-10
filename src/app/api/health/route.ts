import { NextResponse } from "next/server";
import { isPayPalConfigured, isShopifyConfigured, isStripeConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * 存活检查。
 *
 * 注意:**只报"配置是否齐",不去连 Shopify**。这个端点是容器 HEALTHCHECK 的判据,
 * 如果让它依赖外部服务,Shopify 抖一下容器就会被判定不健康并重启 —— 那是把
 * 可用性绑到了第三方上。但"凭据没送到容器"这种错误必须能被一眼看见:
 * 它不会让进程崩,只会让站点静默降级(商品目录回退本地表、政策页空正文),
 * 已经在真实部署上因此排查了两轮。
 */
export function GET() {
  const shopify = isShopifyConfigured();
  const stripe = isStripeConfigured();
  const paypal = isPayPalConfigured();
  const siteUrl = Boolean(process.env.SITE_URL?.trim());

  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    config: {
      shopify: shopify ? "configured" : "MISSING — 商品目录会回退本地兜底表,政策页为空",
      siteUrl: siteUrl ? "configured" : "MISSING — sitemap/canonical 与结算回跳地址会指向 localhost",
      stripe: stripe ? "configured" : "missing",
      paypal: paypal ? "configured" : "missing",
    },
  });
}
