import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import { countryDecision } from "@/lib/geo";
import { AUTOMATIC_MARKET_TTL_SECONDS, MARKET_COOKIE, normalizeMarketCountry } from "@/lib/market";
import { getMarketCountries } from "@/server/shopify/localization";

export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store, private" };
const input = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("resolve"),
    timeZone: z.string().max(100).optional(),
    languages: z.array(z.string().max(100)).max(20).optional(),
  }),
  z.object({
    mode: z.literal("select"),
    country: z.string().max(10).transform(normalizeMarketCountry).refine(Boolean),
  }),
]);
export async function GET(request: Request) {
  const decision = countryDecision(request.headers);
  if (new URL(request.url).searchParams.get("context") === "1")
    return NextResponse.json(decision, { headers: noStore });
  try {
    return NextResponse.json(
      { ...decision, countries: await getMarketCountries() },
      { headers: noStore },
    );
  } catch {
    return NextResponse.json({ error: "market_unavailable" }, { status: 503, headers: noStore });
  }
}
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(env.SITE_URL).origin)
    return NextResponse.json({ error: "invalid_origin" }, { status: 403, headers: noStore });
  let parsed: z.infer<typeof input>;
  try {
    if (Number(request.headers.get("content-length") || 0) > 5000) throw new Error();
    const text = await request.text();
    if (text.length > 5000) throw new Error();
    parsed = input.parse(JSON.parse(text));
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400, headers: noStore });
  }
  let preference;
  if (parsed.mode === "resolve") {
    const decision = countryDecision(request.headers, parsed);
    if (decision.persisted) return NextResponse.json(decision, { headers: noStore });
    preference = {
      country: decision.country,
      source: decision.source,
      resolvedAt: decision.resolvedAt,
      ...(decision.timeZone ? { timeZone: decision.timeZone } : {}),
    };
  } else {
    try {
      const countries = await getMarketCountries();
      if (!countries.some((c) => c.code === parsed.country))
        return NextResponse.json(
          { error: "unsupported_country" },
          { status: 400, headers: noStore },
        );
    } catch {
      return NextResponse.json({ error: "market_unavailable" }, { status: 503, headers: noStore });
    }
    preference = { country: parsed.country!, source: "manual" as const };
  }
  const response = NextResponse.json({ ...preference, persisted: true }, { headers: noStore });
  response.cookies.set(MARKET_COOKIE, JSON.stringify(preference), {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: env.SITE_URL.startsWith("https:"),
    maxAge: preference.source === "manual" ? 90 * 86400 : AUTOMATIC_MARKET_TTL_SECONDS,
  });
  return response;
}
