import { NextResponse } from "next/server";
import { getLiveProducts, getLiveSeriesList } from "@/server/catalog/live";

export const dynamic = "force-dynamic";

/**
 * 公开商品/系列 API —— 客户端购物车(CartProvider/CartDrawer)据此校验/渲染
 * 购物车行,因此这里必须是实时数据源:每次请求都反映 Shopify 当前真实的
 * 系列成员/价格/图片/库存,而不是本地手写死的快照。
 */
export async function GET() {
  const [products, series] = await Promise.all([getLiveProducts(), getLiveSeriesList()]);
  return NextResponse.json({
    products: products.map((p) => ({
      code: p.code,
      slug: p.slug,
      name: p.name,
      description: p.description,
      price: { currency: "usd", amountCents: p.priceCents },
      series: p.series,
      dimensions: p.dimensions,
      emotionTags: p.emotionTags,
      images: p.images,
      available: p.isAvailable,
    })),
    categories: series.map((s) => ({ code: s.slug, name: s.name })),
  });
}
