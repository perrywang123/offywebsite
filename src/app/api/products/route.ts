import { NextResponse } from "next/server";
import { getProducts, seriesList } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    products: getProducts().map((p) => ({
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
    categories: seriesList.map((s) => ({ code: s.slug, name: s.name })),
  });
}
