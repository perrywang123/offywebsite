import { z } from "zod";
import { env, kolEnabled } from "@/lib/env";
import { collabsMode } from "@/server/collabs/mode";
import { secureEqual } from "@/server/kol/core";
import { flowToken } from "@/server/collabs/flow-auth";
import { acceptAttribution, validateAttribution } from "@/server/collabs/events";
import { getKolDb } from "@/server/kol/database";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store, private", "X-Robots-Tag": "noindex, nofollow" };
export async function POST(request: Request) {
  if (
    !kolEnabled() ||
    !collabsMode() ||
    !env.KOL_SIGNING_SECRET ||
    !secureEqual(
      request.headers.get("authorization") ?? "",
      `Bearer ${flowToken(env.KOL_SIGNING_SECRET)}`,
    )
  )
    return new Response(null, { status: 404, headers });
  const limit = 32768;
  if (Number(request.headers.get("content-length") ?? 0) > limit)
    return new Response(null, { status: 413, headers });
  let raw: unknown;
  try {
    const reader = request.body?.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    if (reader)
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        size += part.value.length;
        if (size > limit) {
          await reader.cancel();
          return new Response(null, { status: 413, headers });
        }
        chunks.push(part.value);
      }
    raw = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400, headers });
  }
  try {
    if (new URL(request.url).searchParams.get("validate") === "1") {
      validateAttribution(raw, env.SHOPIFY_STORE_DOMAIN ?? "");
      return Response.json({ ok: true, validationOnly: true }, { headers });
    }
    const inserted = acceptAttribution(getKolDb(), raw, env.SHOPIFY_STORE_DOMAIN ?? "");
    return Response.json({ ok: true, duplicate: !inserted }, { headers });
  } catch (error) {
    if (
      error instanceof z.ZodError ||
      (error instanceof Error &&
        ["flow_shop_mismatch", "flow_timestamp_invalid"].includes(error.message))
    )
      return Response.json({ error: "invalid_event" }, { status: 400, headers });
    return Response.json({ error: "temporarily_unavailable" }, { status: 503, headers });
  }
}
