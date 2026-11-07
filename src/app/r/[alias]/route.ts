import { collabsMode } from "@/server/collabs/mode";
import { listCreators } from "@/server/collabs/service";
import { officialLink } from "@/lib/collabs/links";
import { NextResponse } from "next/server";
import { env, kolEnabled } from "@/lib/env";
import { getKolDb } from "@/server/kol/database";
import { startReferral } from "@/server/kol/core";
export const dynamic = "force-dynamic";
const headers = {
  "Cache-Control": "no-store, private",
  "X-Robots-Tag": "noindex, nofollow",
  "Referrer-Policy": "no-referrer",
};
export async function HEAD() {
  return new Response(null, { status: 204, headers });
}
export async function GET(request: Request, { params }: { params: Promise<{ alias: string }> }) {
  if (!kolEnabled()) return new Response("Not found", { status: 404, headers });
  const { alias } = await params;
  if (
    request.headers.has("next-router-prefetch") ||
    request.headers.get("purpose") === "prefetch" ||
    request.headers.get("sec-purpose")?.includes("prefetch") ||
    /bot|crawler|spider|preview|facebookexternalhit|slackbot|whatsapp|telegrambot/i.test(
      request.headers.get("user-agent") ?? "",
    )
  )
    return new Response(null, { status: 204, headers });
  try {
    if (collabsMode()) {
      const creator = listCreators(getKolDb()).find((c) => c.alias === alias && c.enabled);
      if (creator) {
        const url = new URL(officialLink(creator.officialLink, env.SITE_URL));
        for (const [key, value] of new URL(request.url).searchParams)
          if ((key.startsWith("utm_") || key === "dt_id") && !url.searchParams.has(key))
            url.searchParams.set(key, value);
        return NextResponse.redirect(url, { status: 303, headers });
      }
    }
    const r = collabsMode() ? null : startReferral(getKolDb(), alias);
    if (r) {
      const url = new URL(r.target, env.SITE_URL);
      url.searchParams.set("offy_visit", r.id);
      return NextResponse.redirect(url, { status: 303, headers });
    }
  } catch {
    return NextResponse.redirect(new URL("/products", env.SITE_URL), { status: 303, headers });
  }
  return new Response(
    '<!doctype html><html lang="en"><meta name="viewport" content="width=device-width"><title>Offy · Link unavailable</title><body style="font:16px system-ui;background:#efefef;color:#1d1915;padding:10vh 8vw"><p>OFFY / PARTNERS</p><h1>This collaboration link is unavailable.</h1><p>You can still explore Offy.</p><a href="/products">Explore the shop →</a></body></html>',
    { status: 410, headers: { ...headers, "Content-Type": "text/html; charset=utf-8" } },
  );
}
