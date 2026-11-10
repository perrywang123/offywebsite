import { z } from "zod";
import { normalizeMarketCountry } from "@/lib/market";

const preference = z.object({
  country: z.string().refine((c) => normalizeMarketCountry(c) === c),
  source: z.enum(["manual", "header", "ip", "timezone", "language", "default"]),
  persisted: z.literal(true),
  timeZone: z.string().max(100).optional(),
  resolvedAt: z.number().int().positive().optional(),
});
export type DestinationChange =
  | { mode: "select"; country: string }
  | { mode: "resolve"; timeZone?: string; languages?: string[] };
/** A successful Set-Cookie response alone does not prove the browser accepted it. */
export async function persistDestination(change: DestinationChange, fetcher: typeof fetch = fetch) {
  const signal = AbortSignal.timeout(8000);
  const response = await fetcher("/api/market", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    cache: "no-store",
    signal,
    body: JSON.stringify(change),
  });
  if (!response.ok) throw new Error("destination_unavailable");
  const saved = preference.safeParse(await response.json());
  if (!saved.success) throw new Error("destination_not_saved");
  if (change.mode === "select" && saved.data.country !== change.country)
    throw new Error("destination_not_saved");
  const verify = await fetcher("/api/market?context=1", {
    cache: "no-store",
    credentials: "same-origin",
    signal,
  });
  const actual = preference.safeParse(verify.ok ? await verify.json() : null);
  if (
    !actual.success ||
    actual.data.country !== saved.data.country ||
    actual.data.source !== saved.data.source
  )
    throw new Error("destination_not_saved");
  return actual.data;
}
