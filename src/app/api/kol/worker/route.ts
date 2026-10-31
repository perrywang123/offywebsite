import { env, kolEnabled } from "@/lib/env";
import { getKolDb } from "@/server/kol/database";
import { secureEqual } from "@/server/kol/core";
import { runWorker } from "@/server/kol/sync";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  if (
    !kolEnabled() ||
    !env.KOL_WORKER_SECRET ||
    !secureEqual(request.headers.get("authorization") ?? "", `Bearer ${env.KOL_WORKER_SECRET}`)
  )
    return new Response(null, { status: 404 });
  try {
    return Response.json(await runWorker(getKolDb()), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "worker_failed" }, { status: 503 });
  }
}
