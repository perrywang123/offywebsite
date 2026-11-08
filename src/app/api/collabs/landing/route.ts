import { NextResponse } from "next/server";
import { env, kolEnabled } from "@/lib/env";
import { collabsMode } from "@/server/collabs/mode";
import { landingSchema, LANDING_COOKIE, LANDING_RETENTION_DAYS } from "@/lib/collabs/landing";
import { acceptLanding, forgetLandingVisitor } from "@/server/collabs/landing";
import {
  createLandingLimiter,
  issueLandingVisitor,
  readLandingVisitor,
  landingVisitorHash,
} from "@/server/collabs/landing-auth";
import { getLinkObservationDb } from "@/server/collabs/link-db";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store, private", "X-Robots-Tag": "noindex, nofollow" };
const admit = createLandingLimiter();
function sameOrigin(request: Request) {
  return (
    request.headers.get("origin") === new URL(env.SITE_URL).origin &&
    !["cross-site", "same-site"].includes(request.headers.get("sec-fetch-site") ?? "")
  );
}
function cookieValue(request: Request) {
  const value = request.headers
    .get("cookie")
    ?.split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(LANDING_COOKIE + "="))
    ?.slice(LANDING_COOKIE.length + 1);
  try {
    return value ? decodeURIComponent(value) : undefined;
  } catch {
    return undefined;
  }
}
const cookieOptions = {
  httpOnly: true,
  secure: env.SITE_URL.startsWith("https:"),
  sameSite: "lax" as const,
  path: "/",
};
export async function POST(request: Request) {
  if (!kolEnabled() || !collabsMode() || !env.KOL_SIGNING_SECRET)
    return new Response(null, { status: 404, headers });
  if (!sameOrigin(request)) return new Response(null, { status: 403, headers });
  if (
    request.headers.get("sec-gpc") === "1" ||
    request.headers.has("next-router-prefetch") ||
    /prefetch/i.test(request.headers.get("sec-purpose") ?? request.headers.get("purpose") ?? "") ||
    /bot|crawler|spider|preview|facebookexternalhit|slackbot|whatsapp|telegrambot/i.test(
      request.headers.get("user-agent") ?? "",
    )
  )
    return new Response(null, { status: 204, headers });
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json"))
    return new Response(null, { status: 415, headers });
  const limit = 2048;
  if (Number(request.headers.get("content-length") ?? 0) > limit)
    return new Response(null, { status: 413, headers });
  let input;
  try {
    const reader = request.body?.getReader(),
      chunks: Uint8Array[] = [];
    let length = 0;
    if (reader)
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        length += chunk.value.length;
        if (length > limit) {
          await reader.cancel();
          return new Response(null, { status: 413, headers });
        }
        chunks.push(chunk.value);
      }
    input = landingSchema.parse(JSON.parse(Buffer.concat(chunks).toString("utf8")));
  } catch {
    return Response.json({ error: "invalid_observation" }, { status: 400, headers });
  }
  if (new URL(request.url).searchParams.get("validate") === "1") {
    if (!admit("validation")) return new Response(null, { status: 429, headers });
    return Response.json({ ok: true, validationOnly: true }, { headers });
  }
  const now = Date.now(),
    secret = env.KOL_SIGNING_SECRET;
  const existing = readLandingVisitor(cookieValue(request), secret, now),
    token = existing ? undefined : issueLandingVisitor(secret, now),
    identity = existing ?? readLandingVisitor(token, secret, now)!;
  const visitorHash = landingVisitorHash(identity.id, secret);
  if (!admit(visitorHash, now))
    return new Response(null, { status: 429, headers: { ...headers, "Retry-After": "60" } });
  try {
    const result = acceptLanding(getLinkObservationDb(), input, visitorHash, now);
    if (!result.accepted) return new Response(null, { status: 204, headers });
    const response = NextResponse.json({ ok: true, duplicate: result.duplicate }, { headers });
    if (token)
      response.cookies.set(LANDING_COOKIE, token, {
        ...cookieOptions,
        maxAge: LANDING_RETENTION_DAYS * 86400,
        expires: new Date(now + LANDING_RETENTION_DAYS * 86400000),
      });
    return response;
  } catch {
    return Response.json({ error: "observation_unavailable" }, { status: 503, headers });
  }
}
export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return new Response(null, { status: 403, headers });
  const identity = readLandingVisitor(cookieValue(request), env.KOL_SIGNING_SECRET ?? "");
  let status = 204;
  if (identity)
    try {
      forgetLandingVisitor(
        getLinkObservationDb(),
        landingVisitorHash(identity.id, env.KOL_SIGNING_SECRET!),
      );
    } catch {
      status = 503;
    }
  const response = new NextResponse(null, { status, headers });
  response.cookies.set(LANDING_COOKIE, "", { ...cookieOptions, maxAge: 0 });
  return response;
}
