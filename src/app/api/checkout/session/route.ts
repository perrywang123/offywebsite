import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { env } from "@/lib/env";
import { pickCountry } from "@/lib/geo";
import { clampQuantity } from "@/lib/pricing";
import { createCheckoutSession } from "@/server/checkout/create-checkout-session";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  items: z
    .array(z.object({ code: z.string(), quantity: z.number() }))
    .min(1)
    .max(50),
  locale: z.string().optional(),
  email: z.string().optional(),
});

export async function POST(request: Request) {
  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const items = parsed.items.map((i) => ({
    code: i.code,
    quantity: clampQuantity(i.quantity),
  }));

  // 访客国家决定价格的市场币种(Stripe 通道仍是 USD-only,非 USD 会被拒)。
  const country = pickCountry(await headers(), env.SHOPIFY_MARKET_COUNTRY);
  const result = await createCheckoutSession(items, parsed.locale === "en" ? "en" : "zh", undefined, undefined, undefined, country);

  if (result.ok) {
    return NextResponse.json({ url: result.url });
  }
  return NextResponse.json({ error: result.error }, { status: result.status });
}
