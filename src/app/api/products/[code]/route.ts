import { NextResponse } from "next/server";
import { getProductByCode } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const product = getProductByCode(code);
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
