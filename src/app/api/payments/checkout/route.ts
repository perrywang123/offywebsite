import { collabsMode } from "@/server/collabs/mode";
import { getDiscount, trackingContext } from "@/server/collabs/storefront";
import { NextResponse } from "next/server";
import { z } from "zod";
import { normalizeMarketCountry } from "@/lib/market";
import { pickCountry } from "@/lib/geo";
import { clampQuantity } from "@/lib/pricing";
import { resolveProvider } from "@/server/payments/registry";
import { startCheckoutRecording } from "@/server/checkout-diagnostics/runtime";
import { checkoutMetaReceipt } from "@/server/meta/runtime";
import { metaConfig } from "@/server/meta/config";

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
  expectedCountry: z
    .string()
    .refine((c) => normalizeMarketCountry(c) === c)
    .optional(),
  diagnosticReceipt: z.string().max(100).optional(),
  metaTracking: z.literal(true).optional(),
  referralTicket: z.string().uuid().optional(),
  provider: z.enum(["stripe", "paypal", "shopify"]).optional(),
  items: z
    .array(z.object({ code: z.string().min(1).max(200), quantity: z.number() }))
    .min(1)
    .max(50),
  locale: z.string().optional(),
  email: z.string().email().optional(),
  shipping: shippingSchema.optional(),
});

export async function POST(request: Request) {
  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  // One saved destination drives catalogue, cart context and Shopify buyer identity.
  const country = pickCountry(request.headers);

  const shopifyTracking =
    collabsMode() || metaConfig().enabled
      ? {
          context: trackingContext(request, country, parsed.locale === "en" ? "en" : "zh"),
          discountCode: collabsMode() ? getDiscount(request.headers) : undefined,
        }
      : undefined;
  const provider = resolveProvider(parsed.provider);
  const items = parsed.items.map((i) => ({ code: i.code, quantity: clampQuantity(i.quantity) }));
  const recording =
    provider.name === "shopify"
      ? startCheckoutRecording(
          request.headers,
          items,
          parsed.locale === "en" ? "en" : "zh",
          parsed.diagnosticReceipt,
        )
      : undefined;
  if (parsed.expectedCountry && parsed.expectedCountry !== country) {
    recording?.finish({ ok: false, status: 409, error: "destination_changed" });
    return NextResponse.json(
      { error: "destination_changed", attemptId: recording?.id },
      { status: 409, headers: { "Cache-Control": "no-store" } },
    );
  }
  let result;
  try {
    result = await provider.createCheckout({
      diagnostics: recording?.observe,
      shopifyTracking,
      items,
      locale: parsed.locale === "en" ? "en" : "zh",
      email: parsed.email,
      shipping: parsed.shipping,
      country,
      referralTicket: parsed.referralTicket,
    });
  } catch (error) {
    recording?.finish({ ok: false, status: 502, error: "unexpected_checkout_error" });
    if (provider.name !== "shopify") throw error;
    return NextResponse.json(
      { error: "shopify_error", attemptId: recording?.id },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
  recording?.finish(result);

  if (result.ok) {
    const response = NextResponse.json(
      {
        provider: result.provider,
        redirect: result.redirect,
        attemptId: recording?.id,
        ...(parsed.metaTracking && provider.name === "shopify"
          ? { metaReceipt: checkoutMetaReceipt(recording?.id) }
          : {}),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
    shopifyTracking?.context.applyResponseHeaders(response.headers);
    return response;
  }
  // 4xx 必须带上「哪些商品、为什么」—— 客户端据此在原地指名商品并让顾客重试,
  // 而不是把裸错误码(invalid_items / checkout_failed)印到界面上(方案 P0-3)。
  return NextResponse.json(
    {
      error: result.error,
      ...(result.items ? { items: result.items } : {}),
      attemptId: recording?.id,
    },
    { status: result.status, headers: { "Cache-Control": "no-store" } },
  );
}
