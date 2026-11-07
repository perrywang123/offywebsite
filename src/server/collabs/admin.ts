import { resolveOfficialLink } from "@/lib/collabs/links";
import { resolveCollabsRedirect } from "./storefront";
import { audit } from "../kol/core";
import { z } from "zod";
import { env } from "@/lib/env";
import { reportSchema, previewReport } from "@/lib/collabs/reports";
import type { Db } from "../kol/db";
import {
  importReport,
  reportDetail,
  listReports,
  reconcileReport,
  saveCreator,
  listCreators,
  creatorSchema,
  reviewFinding,
} from "./service";
import { lookupOrder } from "./shopify";
import { collabsMode } from "./mode";
import { linkMetrics } from "./links";
import { attributionState, bindFlowCreator } from "./events";
const headers = { "Cache-Control": "no-store, private", "X-Robots-Tag": "noindex, nofollow" };
export function collabsGet(db: Db, path: string[], request?: Request) {
  if (path[1] === "reports" && path[2])
    return Response.json(reportDetail(db, path[2]), { headers });
  if (path[1] === "links")
    return Response.json(
      linkMetrics(db, Number(request ? (new URL(request.url).searchParams.get("days") ?? 30) : 30)),
      { headers },
    );
  return Response.json(
    {
      mode: env.KOL_ACCOUNTING_MODE,
      creators: listCreators(db),
      reports: listReports(db),
      linkMetrics: linkMetrics(db),
      attribution: attributionState(db),
      officialAdmin: `https://admin.shopify.com/store/${env.SHOPIFY_STORE_DOMAIN?.split(".")[0]}/apps/collabs`,
      creatorPortal: "https://collabs.shopify.com/",
      policy: {
        holdingDays: 30,
        attribution: "Collabs native",
        payment: "Collabs automatic",
        reports: "manual_import",
      },
    },
    { headers },
  );
}
export async function collabsPost(db: Db, path: string[], actor: string, request: Request) {
  if (!collabsMode()) throw new Error("collabs_not_enabled");
  if (Number(request.headers.get("content-length") ?? 0) > 4_500_000)
    throw new Error("report_too_large");
  const text = await request.text();
  if (new TextEncoder().encode(text).length > 4_500_000) throw new Error("report_too_large");
  const raw = JSON.parse(text);
  let result: unknown;
  if (path[1] === "creators") {
    const input = creatorSchema.parse(raw),
      sourceLink = input.officialLink;
    input.officialLink = await resolveOfficialLink(
      sourceLink,
      env.SITE_URL,
      env.SHOPIFY_STORE_DOMAIN ?? "",
      resolveCollabsRedirect,
    );
    result = saveCreator(db, input, actor, env.SITE_URL);
    audit(db, actor, "collabs.creator.source", (result as { id: string }).id, {
      sourceLink,
      resolvedLink: input.officialLink,
    });
  } else if (path[1] === "bind-flow") {
    const input = z
      .object({ nativeId: z.string().regex(/^\d+$/).max(20), creatorId: z.string().uuid() })
      .parse(raw);
    bindFlowCreator(db, input.nativeId, input.creatorId, actor);
    result = { ok: true };
  } else if (path[1] === "preview") result = previewReport(reportSchema.parse(raw));
  else if (path[1] === "import") {
    const input = z
      .object({
        report: reportSchema,
        confirmed: z.literal(true),
        allowOverlap: z.boolean().optional(),
        supersedes: z.string().uuid().optional(),
      })
      .parse(raw);
    result = importReport(db, input.report, actor, input);
  } else if (path[1] === "reconcile") {
    const input = z
      .object({
        id: z.string().uuid(),
        offset: z.number().int().min(0).max(2000).default(0),
        previousId: z.string().uuid().optional(),
      })
      .parse(raw);
    result = await reconcileReport(db, input.id, actor, lookupOrder, {
      offset: input.offset,
      previousId: input.previousId,
    });
  } else if (path[1] === "review") {
    const input = z
      .object({
        checkId: z.string().uuid(),
        findingKey: z.string().max(100),
        reason: z.string().max(1000),
      })
      .parse(raw);
    reviewFinding(db, input.checkId, input.findingKey, actor, input.reason);
    result = { ok: true };
  } else return Response.json({ error: "not_found" }, { status: 404, headers });
  return Response.json(result, { headers });
}
