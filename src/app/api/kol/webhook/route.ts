import { env, kolEnabled } from "@/lib/env";
import { getKolDb } from "@/server/kol/database";
import { acceptWebhook } from "@/server/kol/sync";
export async function POST(request: Request) {
  if (!kolEnabled() || !env.SHOPIFY_WEBHOOK_SECRET) return new Response(null, { status: 404 });
  const reader = request.body?.getReader();
  if (!reader) return new Response(null, { status: 400 });
  let size = 0;
  const parts: Uint8Array[] = [];
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    size += part.value.length;
    if (size > 1024 * 1024) {
      await reader.cancel();
      return new Response(null, { status: 413 });
    }
    parts.push(part.value);
  }
  const raw = Buffer.concat(parts).toString("utf8");
  try {
    acceptWebhook(
      getKolDb(),
      raw,
      request.headers,
      env.SHOPIFY_WEBHOOK_SECRET,
      env.SHOPIFY_STORE_DOMAIN ?? "",
    );
    return new Response(null, { status: 200 });
  } catch (error) {
    const invalid = error instanceof Error && /invalid_|JSON|Unexpected/.test(error.message);
    return new Response(null, { status: invalid ? 401 : 503 });
  }
}
