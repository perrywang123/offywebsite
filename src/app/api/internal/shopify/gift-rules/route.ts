import { env } from "@/lib/env";
import { secureEqual, signature } from "@/server/kol/core";
import { adminRequest } from "@/server/kol/shopify";
import {
  giftRuleIds,
  giftRuleSignature,
  readGiftRules,
  type GiftRule,
} from "@/server/shopify/gift-rules";

const headers = { "Cache-Control": "no-store" };
const pending = new Map<string, Promise<GiftRule[]>>();

export async function POST(request: Request) {
  const secret = env.KOL_WORKER_SECRET;
  const authorization = request.headers.get("x-offy-gift-signature");
  const notFound = () => new Response(null, { status: 404, headers });
  const length = Number(request.headers.get("content-length"));
  if (!secret || !authorization || authorization.length !== 43 || !(length > 0 && length <= 1024)) {
    return notFound();
  }

  const body = await request.text();
  if (
    body.length > 1024 ||
    !secureEqual(authorization, signature(giftRuleSignature + body, secret))
  ) {
    return notFound();
  }
  try {
    const ids = giftRuleIds.parse(JSON.parse(body));
    const key = JSON.stringify([...new Set(ids)].sort());
    let work = pending.get(key);
    if (!work) {
      work = readGiftRules(ids, adminRequest).finally(() => pending.delete(key));
      pending.set(key, work);
    }
    return Response.json({ rules: await work }, { headers });
  } catch {
    return Response.json({ error: "gift_rules_unavailable" }, { status: 503, headers });
  }
}
