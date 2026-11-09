import { z } from "zod";
import { env } from "@/lib/env";
import { countryDecision } from "@/lib/geo";
import { getDb } from "@/server/db/client";
import { createAttempt, clientObservation } from "@/server/checkout-diagnostics/store";
import { maintainDiagnostics } from "@/server/checkout-diagnostics/runtime";

export const dynamic = "force-dynamic";
const inputSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("start"),
    items: z
      .array(
        z.object({ code: z.string().min(1).max(200), quantity: z.number().int().min(1).max(99) }),
      )
      .min(1)
      .max(50),
    locale: z.enum(["en", "zh"]),
    pagePath: z
      .string()
      .max(250)
      .regex(/^\/[a-z0-9/_%\-]*$/i)
      .default("/cart"),
  }),
  z.object({
    action: z.literal("observe"),
    receipt: z.string().min(40).max(100),
    type: z.enum([
      "client_verification_failed",
      "client_timeout",
      "client_error",
      "redirect_requested",
    ]),
  }),
]);
const cache = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" };
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (
    (origin && origin !== new URL(env.SITE_URL).origin) ||
    request.headers.get("sec-fetch-site") === "cross-site"
  )
    return Response.json({ error: "invalid_origin" }, { status: 403, headers: cache });
  let input: z.infer<typeof inputSchema>;
  try {
    input = inputSchema.parse(await request.json());
  } catch {
    return Response.json({ error: "invalid_request" }, { status: 400, headers: cache });
  }
  try {
    maintainDiagnostics();
    const db = getDb();
    if (input.action === "observe") {
      clientObservation(db, input.receipt, input.type);
      return new Response(null, { status: 204, headers: cache });
    }
    return Response.json(
      createAttempt(db, {
        ...input,
        country: countryDecision(request.headers),
      }),
      { headers: cache },
    );
  } catch {
    console.warn("checkout_diagnostic_write_failed");
    return Response.json({ error: "diagnostic_unavailable" }, { status: 503, headers: cache });
  }
}
