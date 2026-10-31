import { env, kolEnabled } from "@/lib/env";
import { getKolDb } from "@/server/kol/database";
import { confirmReferral } from "@/server/kol/core";
export async function POST(request: Request) {
  if (!kolEnabled()) return new Response(null, { status: 404 });
  if (request.headers.get("origin") !== new URL(env.SITE_URL).origin)
    return new Response(null, { status: 403 });
  try {
    const { ticket } = await request.json();
    if (typeof ticket !== "string" || !/^[a-f0-9-]{36}$/.test(ticket))
      return Response.json({ active: false });
    return Response.json(
      { active: confirmReferral(getKolDb(), ticket) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json({ active: false }, { status: 503 });
  }
}
