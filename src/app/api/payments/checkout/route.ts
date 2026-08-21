import { NextResponse } from "next/server";
import { z } from "zod";
import { clampQuantity } from "@/lib/pricing";
import { resolveProvider } from "@/server/payments/registry";

export const dynamic = "force-dynamic";

const shippingSchema = z.object({
  fullName: z.string().min(1),
  phone: z.string().optional(),
  country: z.string().min(2),
  state: z.string().optional(),
  city: z.string().min(1),
  address1: z.string().min(1),
  address2: z.string().optional(),
  postalCode: z.string().min(1),
});

const bodySchema = z.object({
  provider: z.enum(["stripe", "paypal"]).optional(),
  items: z.array(z.object({ code: z.string(), quantity: z.number() })).min(1).max(50),
  locale: z.string().optional(),
  email: z.string().optional(),
  shipping: shippingSchema.optional(),
});

export async function POST(request: Request) {
  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const provider = resolveProvider(parsed.provider);
  const result = await provider.createCheckout({
    items: parsed.items.map((i) => ({ code: i.code, quantity: clampQuantity(i.quantity) })),
    locale: parsed.locale === "en" ? "en" : "zh",
    email: parsed.email,
    shipping: parsed.shipping,
  });

  if (result.ok) {
    return NextResponse.json({ provider: result.provider, redirect: result.redirect });
  }
  return NextResponse.json({ error: result.error }, { status: result.status });
}
