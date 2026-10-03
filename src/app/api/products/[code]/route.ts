import { NextResponse } from "next/server";
import { getLiveProductByCode } from "@/server/catalog/live";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  // 实时解析:供商品详情页之外的客户端场景(购物车抽屉)按 code 实时校验/渲染。
  const product = await getLiveProductByCode(code);
  if (!product) {
    return NextResponse.json({ error: "product_not_found" }, { status: 404 });
  }
  return NextResponse.json({
    product: {
      code: product.code,
      slug: product.slug,
      name: product.name,
      price: { currency: "usd", amountCents: product.priceCents },
      series: product.series,
      dimensions: product.dimensions,
      emotionTags: product.emotionTags,
      images: product.images,
      available: product.isAvailable,
    },
  });
}
