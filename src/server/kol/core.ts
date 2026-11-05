import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { and, eq, desc, sql } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "./db";
import { kolPartners, kolTerms, kolReferrals, kolIntents, kolAudit } from "../db/schema";
import { rateBps } from "./money";
export const SESSION_MS = 30 * 60_000;
const optionalText = z.string().max(2000).default("");
export const cooperationSchema = z
  .object({
    name: z.string().trim().min(1, "请填写 KOL 名称").max(120, "名称最多120个字符"),
    alias: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9][a-z0-9-]{1,47}$/, "推广别名须为2–48位英文、数字或短横线")
      .optional(),
    platform: z.string().trim().min(1, "请填写合作平台").max(100, "平台最多100个字符"),
    socialUrl: z
      .string()
      .trim()
      .max(1000, "社媒主页链接最多1000个字符")
      .refine(
        (v) => v === "" || (/^https:\/\//i.test(v) && z.url().safeParse(v).success),
        "请填写完整的 HTTPS 链接，或留空",
      )
      .default(""),
    email: z.string().trim().email("请填写有效联系邮箱").max(254),
    rate: z.string().refine((v) => {
      try {
        rateBps(v);
        return true;
      } catch {
        return false;
      }
    }, "佣金须为0–100%，最多两位小数"),
    startsAt: z.iso.date("请选择有效开始日期"),
    endsAt: z.iso.date("请选择有效结束日期"),
    target: z
      .string()
      .regex(
        /^\/(?:products(?:\/[a-z0-9-]+)?|collections(?:\/[a-z0-9-]+)?)?$/,
        "请选择有效站内购物页面（首页、商品或系列页）；达人推广链接由系统生成",
      ),
    status: z.enum(["draft", "active", "paused"]),
    contractUrl: z
      .union([
        z.literal(""),
        z
          .string()
          .url()
          .max(2000)
          .regex(/^https:\/\//),
      ])
      .default(""),
    contractStatus: optionalText,
    videos: optionalText,
    notes: optionalText,
    payout: optionalText,
  })
  .refine(
    (v) => Number.isFinite(Date.parse(v.startsAt)) && Date.parse(v.endsAt) > Date.parse(v.startsAt),
    { message: "合作结束日须晚于开始日", path: ["endsAt"] },
  );
export type Cooperation = z.input<typeof cooperationSchema>;
function generatedAlias(name: string) {
  const slug = name
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/, "");
  return slug.length >= 2 ? slug : `kol-${randomUUID().slice(0, 8)}`;
}
export function audit(
  db: Db,
  actor: string,
  action: string,
  entity: string,
  detail: unknown,
  now = Date.now(),
) {
  db.insert(kolAudit)
    .values({
      id: randomUUID(),
      actor,
      action,
      entity,
      detail: JSON.stringify(detail),
      createdAt: now,
    })
    .run();
}
export function currentTerms(db: Db, id: string) {
  return db
    .select()
    .from(kolTerms)
    .where(eq(kolTerms.kolId, id))
    .orderBy(desc(kolTerms.version))
    .get();
}
export function createPartner(db: Db, input: Cooperation, actor: string, now = Date.now()) {
  const data = cooperationSchema.parse(input),
    id = randomUUID();
  return db.transaction((tx) => {
    const partner = {
      id,
      alias: data.alias ?? generatedAlias(data.name),
      name: data.name,
      status: data.status,
      version: 1,
      createdAt: now,
    };
    if (data.alias) tx.insert(kolPartners).values(partner).run();
    else {
      const base = partner.alias.slice(0, 39).replace(/-+$/, "");
      // The unique index also reserves paused/historical aliases; retry only that conflict.
      while (
        !tx
          .insert(kolPartners)
          .values(partner)
          .onConflictDoNothing({ target: kolPartners.alias })
          .run().changes
      )
        partner.alias = `${base}-${randomUUID().slice(0, 8)}`;
    }
    const saved = { ...data, alias: partner.alias };
    tx.insert(kolTerms)
      .values({
        id: randomUUID(),
        kolId: id,
        version: 1,
        rateBps: rateBps(data.rate),
        startsAt: Date.parse(`${data.startsAt}T00:00:00+08:00`),
        endsAt: Date.parse(`${data.endsAt}T00:00:00+08:00`) + 86400000,
        data: JSON.stringify(saved),
        createdAt: now,
      })
      .run();
    audit(tx, actor, "partner.create", id, saved, now);
    return partner;
  });
}
export function updatePartner(
  db: Db,
  id: string,
  input: Cooperation,
  actor: string,
  now = Date.now(),
) {
  const data = cooperationSchema.parse(input);
  return db.transaction((tx) => {
    const old = tx.select().from(kolPartners).where(eq(kolPartners.id, id)).get();
    if (!old) throw new Error("partner_not_found");
    if (data.alias !== undefined && old.alias !== data.alias) throw new Error("alias_immutable");
    tx.update(kolPartners)
      .set({ name: data.name, status: data.status, version: old.version + 1 })
      .where(eq(kolPartners.id, id))
      .run();
    tx.insert(kolTerms)
      .values({
        id: randomUUID(),
        kolId: id,
        version: old.version + 1,
        rateBps: rateBps(data.rate),
        startsAt: Date.parse(`${data.startsAt}T00:00:00+08:00`),
        endsAt: Date.parse(`${data.endsAt}T00:00:00+08:00`) + 86400000,
        data: JSON.stringify({ ...data, alias: old.alias }),
        createdAt: now,
      })
      .run();
    audit(tx, actor, "partner.update", id, { before: old, after: data }, now);
  });
}
export function activePartner(db: Db, id: string, now: number) {
  const p = db.select().from(kolPartners).where(eq(kolPartners.id, id)).get(),
    terms = currentTerms(db, id);
  return p?.status === "active" && terms && terms.startsAt <= now && terms.endsAt > now
    ? { p, terms }
    : null;
}
export function startReferral(db: Db, alias: string, now = Date.now()) {
  const p = db.select().from(kolPartners).where(eq(kolPartners.alias, alias.toLowerCase())).get();
  if (!p) return null;
  const active = activePartner(db, p.id, now);
  if (!active) return null;
  const id = randomUUID();
  db.transaction((tx) => {
    tx.insert(kolReferrals).values({ id, kolId: p.id, createdAt: now, lastActiveAt: now }).run();
    tx.update(kolPartners)
      .set({ requests: sql`${kolPartners.requests} + 1` })
      .where(eq(kolPartners.id, p.id))
      .run();
  });
  return { id, target: JSON.parse(active.terms.data).target as string };
}
export function confirmReferral(db: Db, id: string, now = Date.now()): boolean {
  return db.transaction((tx) => {
    const r = tx.select().from(kolReferrals).where(eq(kolReferrals.id, id)).get();
    if (!r || now - r.lastActiveAt > SESSION_MS || !activePartner(tx, r.kolId, now)) return false;
    tx.update(kolReferrals)
      .set({ lastActiveAt: now, landedAt: r.landedAt ?? now })
      .where(eq(kolReferrals.id, id))
      .run();
    if (!r.landedAt)
      tx.update(kolPartners)
        .set({ landings: sql`${kolPartners.landings} + 1` })
        .where(eq(kolPartners.id, r.kolId))
        .run();
    return true;
  });
}
export function signature(id: string, secret: string) {
  return createHmac("sha256", secret).update(id).digest("base64url");
}
export function secureEqual(a: string, b: string) {
  const aa = Buffer.from(a),
    bb = Buffer.from(b);
  return aa.length === bb.length && timingSafeEqual(aa, bb);
}
export function createIntent(db: Db, referralId: string, secret: string, now = Date.now()) {
  const r = db.select().from(kolReferrals).where(eq(kolReferrals.id, referralId)).get();
  if (!r || r.landedAt === null || now - r.lastActiveAt > SESSION_MS) return null;
  const active = activePartner(db, r.kolId, now);
  if (!active) return null;
  const intent = {
    id: randomUUID(),
    referralId,
    kolId: r.kolId,
    termsId: active.terms.id,
    rateBps: active.terms.rateBps,
    createdAt: now,
    expiresAt: now + SESSION_MS,
  };
  db.insert(kolIntents).values(intent).run();
  return { ...intent, reference: `${intent.id}.${signature(intent.id, secret)}` };
}
export function cartToken(cartId: string) {
  return cartId.replace(/^gid:\/\/shopify\/Cart\//, "").split("?")[0];
}
export function bindCart(
  db: Db,
  id: string,
  cartId: string,
  checkoutUrl: string,
  now = Date.now(),
) {
  if (!/^https?:\/\//.test(checkoutUrl) || !Number.isFinite(now))
    throw new Error("invalid_cart_binding");
  const result = db
    .update(kolIntents)
    .set({ cartToken: cartToken(cartId) })
    .where(and(eq(kolIntents.id, id), sql`${kolIntents.cartToken} IS NULL`))
    .run();
  if (!result.changes) throw new Error("intent_already_bound");
}
export function verifyAttribution(
  db: Db,
  reference: string,
  orderCart: string | null,
  orderId: string,
  paidAt: number,
  secret: string,
) {
  const [id, sig] = reference.split(".");
  if (!id || !sig || !secureEqual(sig, signature(id, secret))) throw new Error("invalid_reference");
  const i = db.select().from(kolIntents).where(eq(kolIntents.id, id)).get();
  if (!i) throw new Error("intent_missing");
  if (!orderCart || !i.cartToken || cartToken(orderCart) !== i.cartToken)
    throw new Error("cart_mismatch");
  if (i.orderId && i.orderId !== orderId) throw new Error("intent_replay");
  if (paidAt < i.createdAt || paidAt > i.expiresAt) throw new Error("checkout_expired");
  return i;
}
