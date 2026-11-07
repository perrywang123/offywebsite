import { collabsGet, collabsPost } from "@/server/collabs/admin";
import { collabsMode } from "@/server/collabs/mode";
import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { env } from "@/lib/env";
import { diagnosticAdminGet, diagnosticAdminPost } from "@/server/checkout-diagnostics/admin";
import { getKolDb } from "@/server/kol/database";
import { kolShopOrders } from "@/server/db/schema";
import {
  AccessError,
  ADMIN_COOKIE,
  authConfig,
  requireIngress,
  requireMutation,
  requireAdmin,
  authenticate,
  logout,
  cookieToken,
  throttle,
} from "@/server/kol/auth";
import {
  cooperationSchema,
  createPartner,
  updatePartner,
  audit,
  signature,
} from "@/server/kol/core";
import { snapshot } from "@/server/kol/snapshot";
import { codeGateway, campaigns, shopifyAdminConfigured } from "@/server/kol/shopify";
import {
  bindExistingCode,
  queueCode,
  retryCode,
  endBinding,
  refreshCode,
} from "@/server/kol/codes";
import { reconcileOrder, runWorker } from "@/server/kol/sync";
import {
  createSettlement,
  cancelSettlement,
  lockSettlement,
  paySettlement,
  correctPayment,
  settlementOrders,
  settlementCsv,
} from "@/server/kol/ledger";
export const dynamic = "force-dynamic";
const cache = { "Cache-Control": "no-store, private", "X-Robots-Tag": "noindex, nofollow" };
function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: cache });
}
function failure(error: unknown) {
  if (error instanceof AccessError) return json({ error: error.message }, error.status);
  if (error instanceof z.ZodError)
    return json(
      {
        error: "invalid_input",
        details: error.issues.map((e) => ({ field: e.path.join("."), message: e.message })),
      },
      400,
    );
  const reason = error instanceof Error ? error.message : "operation_failed";
  if (/UNIQUE constraint/.test(reason)) return json({ error: "already_reserved" }, 409);
  if (/FOREIGN KEY/.test(reason)) return json({ error: "related_record_missing" }, 409);
  // Do not forward SQL, response bodies or credentials to the browser.
  return json({ error: /^[a-z_0-9]+$/.test(reason) ? reason : "operation_failed" }, 409);
}
type Context = { params: Promise<{ path?: string[] }> };
export async function GET(request: Request, context: Context) {
  try {
    requireIngress(request.headers);
    const path = (await context.params).path ?? [];
    if (path[0] === "checkouts") return diagnosticAdminGet(request, path);
    const db = getKolDb(),
      admin = requireAdmin(db, request.headers);
    if (path[0] === "collabs") return collabsGet(db, path);
    if (path[0] === "state")
      return json({
        ...snapshot(db),
        admin,
        siteUrl: env.SITE_URL,
        accountingMode: env.KOL_ACCOUNTING_MODE,
        settlementsEnabled: !collabsMode() && env.KOL_SETTLEMENTS_ENABLED === "true",
      });
    if (path[0] === "connection")
      return json({ scopes: await codeGateway.scopes(), campaigns: await campaigns() });
    if (path[0] === "settlements" && path[1] && path[2] === "csv") {
      audit(db, admin.id, "settlement.export", path[1], {});
      return new Response(settlementCsv(db, path[1]), {
        headers: {
          ...cache,
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="offy-settlement-${path[1].replace(/[^a-z0-9-]/gi, "")}.csv"`,
        },
      });
    }
    return json({ error: "not_found" }, 404);
  } catch (error) {
    return failure(error);
  }
}
const idSchema = z.string().min(1).max(150),
  textSchema = z.string().max(2000);
export async function POST(request: Request, context: Context) {
  try {
    requireMutation(request.headers);
    const path = (await context.params).path ?? [];
    if (path[0] === "checkouts") return diagnosticAdminPost(request, path);
    const db = getKolDb();
    if (path[0] === "login") {
      throttle(
        db,
        `ingress:${signature(request.headers.get("x-real-ip") ?? "unknown", env.KOL_INGRESS_SECRET!)}`,
        Date.now(),
        30,
      );
      const input = z
        .object({ email: z.string().email().max(254), password: z.string().min(1).max(256) })
        .parse(await request.json());
      const result = await authenticate(db, input.email, input.password);
      if (!result) return json({ error: "invalid_credentials" }, 401);
      const response = json({ admin: result.admin });
      response.cookies.set(ADMIN_COOKIE, result.token, {
        httpOnly: true,
        secure: authConfig().secure,
        sameSite: "strict",
        path: "/",
        maxAge: 8 * 3600,
      });
      return response;
    }
    const admin = requireAdmin(db, request.headers);
    if (path[0] === "logout") {
      logout(db, cookieToken(request.headers));
      audit(db, admin.id, "logout", admin.id, {});
      const response = json({ ok: true });
      response.cookies.set(ADMIN_COOKIE, "", {
        httpOnly: true,
        secure: authConfig().secure,
        sameSite: "strict",
        path: "/",
        maxAge: 0,
      });
      return response;
    }
    if (path[0] === "collabs") return await collabsPost(db, path, admin.id, request);
    if (collabsMode() && path[0] !== "sync") throw new AccessError("collabs_managed", 409);
    if (path[0] === "partners") {
      const input = cooperationSchema.parse(await request.json());
      if (path[1]) {
        updatePartner(db, path[1], input, admin.id);
        return json({ ok: true });
      }
      return json(createPartner(db, input, admin.id));
    }
    if (path[0] === "codes") {
      const b = z
        .object({
          kolId: idSchema.optional(),
          code: z.string().max(64).optional(),
          campaignId: idSchema.optional(),
          id: idSchema.optional(),
        })
        .parse(await request.json());
      if (path[1] === "bind")
        return json(
          await bindExistingCode(
            db,
            idSchema.parse(b.kolId),
            z.string().parse(b.code),
            codeGateway,
            admin.id,
          ),
        );
      if (path[1] === "generate")
        return json(
          await queueCode(
            db,
            idSchema.parse(b.kolId),
            idSchema.parse(b.campaignId),
            z.string().parse(b.code),
            codeGateway,
            admin.id,
          ),
        );
      if (path[1] === "retry") retryCode(db, idSchema.parse(b.id), admin.id);
      else if (path[1] === "end") endBinding(db, idSchema.parse(b.id), admin.id);
      else if (path[1] === "refresh")
        await refreshCode(db, idSchema.parse(b.id), codeGateway, admin.id);
      else return json({ error: "not_found" }, 404);
      return json({ ok: true });
    }
    if (path[0] === "orders") {
      const b = z
        .object({ id: idSchema, reason: textSchema.optional() })
        .parse(await request.json());
      if (path[1] === "reconcile") {
        audit(db, admin.id, "order.recheck", b.id, {});
        return json(await reconcileOrder(db, b.id));
      }
      if (path[1] === "hold") {
        if (!b.reason?.trim()) throw new Error("reason_required");
        db.update(kolShopOrders)
          .set({ status: "review", reason: `manual_hold:${b.reason}` })
          .where(eq(kolShopOrders.id, b.id))
          .run();
        audit(db, admin.id, "order.manual_hold", b.id, { reason: b.reason });
        return json({ ok: true });
      }
      if (path[1] === "release") {
        if (!b.reason?.trim()) throw new Error("reason_required");
        audit(db, admin.id, "order.release_hold", b.id, { reason: b.reason });
        db.update(kolShopOrders).set({ reason: null }).where(eq(kolShopOrders.id, b.id)).run();
        return json(await reconcileOrder(db, b.id));
      }
    }
    if (path[0] === "settlements") {
      if (env.KOL_SETTLEMENTS_ENABLED !== "true")
        throw new AccessError("settlement_launch_gate_disabled");
      const b = z
        .object({
          id: idSchema.optional(),
          kolId: idSchema.optional(),
          currency: z
            .string()
            .regex(/^[A-Z]{3}$/)
            .optional(),
          month: z.string().optional(),
          reference: z.string().max(500).optional(),
          reason: textSchema.optional(),
        })
        .parse(await request.json());
      if (!path[1])
        return json(
          createSettlement(
            db,
            idSchema.parse(b.kolId),
            z.string().parse(b.currency),
            z.string().parse(b.month),
            admin.id,
          ),
        );
      const id = idSchema.parse(b.id),
        reconcile = async () => {
          for (const oid of settlementOrders(db, id)) await reconcileOrder(db, oid);
        };
      if (path[1] === "lock") await lockSettlement(db, id, admin.id, reconcile);
      else if (path[1] === "pay")
        await paySettlement(db, id, b.reference ?? "", b.reason ?? "", admin.id, reconcile);
      else if (path[1] === "cancel") cancelSettlement(db, id, b.reason ?? "", admin.id);
      else if (path[1] === "correct")
        correctPayment(db, id, b.reference ?? "", b.reason ?? "", admin.id);
      else return json({ error: "not_found" }, 404);
      return json({ ok: true });
    }
    if (path[0] === "sync") {
      if (!shopifyAdminConfigured()) throw new Error("shopify_admin_not_configured");
      audit(db, admin.id, "sync.run", "worker", {});
      return json(await runWorker(db));
    }
    return json({ error: "not_found" }, 404);
  } catch (error) {
    return failure(error);
  }
}
