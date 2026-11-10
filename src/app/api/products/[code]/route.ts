import { NextResponse } from "next/server";
import { pickCountry } from "@/lib/geo";
import { getLiveProductByCode } from "@/server/catalog/live";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  // 价格按发起请求的访客所在国家对应的市场币种返回(与页面展示一致)。
  try {
    const country = pickCountry(request.headers);
    const expected = request.headers.get("X-Offy-Expected-Country");
    if (expected && expected !== country)
      return NextResponse.json(
        { error: "destination_changed" },
        { status: 409, headers: { "Cache-Control": "no-store" } },
      );
    // 实时解析:供商品详情页之外的客户端场景(购物车抽屉)按 code 实时校验/渲染。
    const product = await getLiveProductByCode(code, country);
    if (!product) {
      return NextResponse.json(
        { error: "product_not_found" },
        { status: 404, headers: { "Cache-Control": "no-store" } },
      );
    }
    return NextResponse.json(
      {
        product: {
          code: product.code,
          slug: product.slug,
          name: product.name,
          price: { currency: product.currency.toLowerCase(), amountCents: product.priceCents },
          series: product.series,
          dimensions: product.dimensions,
          emotionTags: product.emotionTags,
          images: product.images,
          available: product.isAvailable,
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "catalog_unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "5" } },
    );
  }
}
