import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import { pickCountry } from "@/lib/geo";
import { clampQuantity } from "@/lib/pricing";
import { resolveProvider } from "@/server/payments/registry";
import { startCheckoutRecording } from "@/server/checkout-diagnostics/runtime";

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
  diagnosticReceipt: z.string().max(100).optional(),
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

  // 结算必须用**访客所在国家**的 Shopify Markets 上下文,否则站上显示 £37.90、
  // 结账页却按默认市场(US)收 $49.90。国家取请求头(pickCountry 会自动排除
  // XX/T1 之类的非国家值);拿不到就回落 SHOPIFY_MARKET_COUNTRY。
  // 这里读 `request.headers`(而非 next/headers 的 headers()):前置层注入的
  // geo 头是随请求进来的,直接用 request 既等价又不依赖请求作用域。
  const country = pickCountry(request.headers, env.SHOPIFY_MARKET_COUNTRY);

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
  let result;
  try {
    result = await provider.createCheckout({
      diagnostics: recording?.observe,
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
    return NextResponse.json(
      { provider: result.provider, redirect: result.redirect, attemptId: recording?.id },
      { headers: { "Cache-Control": "no-store" } },
    );
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
