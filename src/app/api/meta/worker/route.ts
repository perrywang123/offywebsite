import { timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";
import { runMetaWorker } from "@/server/meta/runtime";
export const dynamic = "force-dynamic";
export const maxDuration = 40;
export async function POST(request: Request) {
  const secret = env.META_WORKER_SECRET || env.KOL_WORKER_SECRET;
  const expected = Buffer.from(`Bearer ${secret ?? ""}`),
    actual = Buffer.from(request.headers.get("authorization") ?? "");
  if (
    !secret ||
    secret.length < 32 ||
    actual.length !== expected.length ||
    !timingSafeEqual(actual, expected)
  )
    return new Response(null, { status: 404 });
  try {
    return Response.json(await runMetaWorker(), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "meta_worker_unavailable" }, { status: 503 });
  }
}
