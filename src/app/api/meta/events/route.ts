import { NextResponse } from "next/server";
import { z } from "zod";
import { createHash } from "node:crypto";
import { env } from "@/lib/env";
import { eventSchema, checkoutObservation } from "@/lib/meta/events";
import { metaConfig } from "@/server/meta/config";
import { getMetaDb, receiptAttempt } from "@/server/meta/runtime";
import { acceptEvent, forgetVisitor } from "@/server/meta/store";
import { diagnosticKey } from "@/server/checkout-diagnostics/crypto";
import { createLandingLimiter } from "@/server/collabs/landing-auth";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store, private", "X-Robots-Tag": "noindex, nofollow" };
const admit = createLandingLimiter(1000, 120);
const COOKIE = "offy_meta_visitor";
function guard(request: Request) {
  return (
    request.headers.get("origin") === new URL(env.SITE_URL).origin &&
    !["cross-site", "same-site"].includes(request.headers.get("sec-fetch-site") ?? "")
  );
}
async function body(request: Request) {
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new Error("invalid_body");
  if (Number(request.headers.get("content-length") ?? 0) > 12000) throw new Error("body_too_large");
  const reader = request.body?.getReader(),
    chunks: Uint8Array[] = [];
  let size = 0;
  if (reader)
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.length;
      if (size > 12000) {
        await reader.cancel();
        throw new Error("body_too_large");
      }
      chunks.push(part.value);
    }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
function existingVisitor(request: Request) {
  return request.headers
    .get("cookie")
    ?.split(";")
    .map((v) => v.trim())
    .find((v) => v.startsWith(COOKIE + "="))
    ?.slice(COOKIE.length + 1);
}
export async function POST(request: Request) {
  const config = metaConfig();
  if (!config.enabled) return new Response(null, { status: 404, headers });
  if (!guard(request)) return new Response(null, { status: 403, headers });
  if (
    request.headers.get("sec-gpc") === "1" ||
    /bot|crawler|spider|preview|facebookexternalhit/i.test(request.headers.get("user-agent") ?? "")
  )
    return new Response(null, { status: 204, headers });
  const rateKey = createHash("sha256")
    .update(request.headers.get("x-real-ip") ?? "unknown")
    .digest("hex");
  if (!admit(rateKey)) return new Response(null, { status: 429, headers });
  let input;
  try {
    input = eventSchema.parse(await body(request));
  } catch {
    return Response.json({ error: "invalid_event" }, { status: 400, headers });
  }
  // Anonymous identities can rotate when first-party storage is unavailable.
  // Ingestion is rate-limited by the ingress IP, not this client-provided identity.
  if (
    /^\/(?:admin|api|checkout)(?:\/|$)/.test(input.pagePath) &&
    !(checkoutObservation(input.name) && input.pagePath === "/checkout")
  )
    return new Response(null, { status: 400, headers });
  try {
    const result = acceptEvent(getMetaDb(), input, {
      key: diagnosticKey(),
      capi: config.capi,
      origin: new URL(env.SITE_URL).origin,
      attemptId: checkoutObservation(input.name)
        ? receiptAttempt(input.checkoutReceipt)
        : undefined,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });
    const response = NextResponse.json({ ok: true, ...result }, { headers });
    response.cookies.set(COOKIE, input.visitorId, {
      httpOnly: true,
      secure: env.SITE_URL.startsWith("https:"),
      sameSite: "strict",
      path: "/",
      maxAge: 30 * 86400,
    });
    return response;
  } catch {
    return Response.json({ error: "observation_unavailable" }, { status: 503, headers });
  }
}
export async function DELETE(request: Request) {
  if (!guard(request)) return new Response(null, { status: 403, headers });
  try {
    const { visitorId } = z
      .object({ visitorId: z.string().uuid() })
      .strict()
      .parse(await body(request));
    if (existingVisitor(request) !== visitorId) return new Response(null, { status: 403, headers });
    forgetVisitor(getMetaDb(), visitorId, diagnosticKey());
    const response = new NextResponse(null, { status: 204, headers });
    response.cookies.set(COOKIE, "", {
      httpOnly: true,
      secure: env.SITE_URL.startsWith("https:"),
      sameSite: "strict",
      path: "/",
      maxAge: 0,
    });
    return response;
  } catch {
    return new Response(null, { status: 503, headers });
  }
}
