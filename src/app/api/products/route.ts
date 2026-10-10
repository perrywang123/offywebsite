import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { pickCountry } from "@/lib/geo";
import { getLiveProducts, getLiveSeriesList } from "@/server/catalog/live";

export const dynamic = "force-dynamic";

/**
 * 公开商品/系列 API —— 客户端购物车(CartProvider/CartDrawer)据此校验/渲染
 * 购物车行,因此这里必须是实时数据源:每次请求都反映 Shopify 当前真实的
 * 系列成员/价格/图片/库存,而不是本地手写死的快照。
 *
 * 价格按**发起请求的访客所在国家**对应的市场币种返回(与页面展示、Shopify
 * 结账金额三者一致)。币种放在 `price.currency` 里下发,客户端不再假设 USD;
 * 购物车各行的价格可能因此与上一国家不同——这正是"跟随访客市场"的预期行为。
 */
export async function GET(request: Request) {
  const country = pickCountry(request.headers, env.SHOPIFY_MARKET_COUNTRY);
  const [products, series] = await Promise.all([getLiveProducts(country), getLiveSeriesList()]);
  return NextResponse.json({
    products: products.map((p) => ({
      code: p.code,
      slug: p.slug,
      name: p.name,
      description: p.description,
      price: { currency: p.currency.toLowerCase(), amountCents: p.priceCents },
      series: p.series,
      dimensions: p.dimensions,
      emotionTags: p.emotionTags,
      images: p.images,
      available: p.isAvailable,
    })),
    categories: series.map((s) => ({ code: s.slug, name: s.name })),
  });
}
