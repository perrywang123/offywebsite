import { z } from "zod";
import { env } from "@/lib/env";
import { metaConfig } from "./config";
import { evidenceFilterSchema } from "./filters";
import { evidenceOverview, traceEvidence } from "./evidence";
import { listMetaEvents } from "./store";
import { getMetaDb } from "./runtime";
import { shopifyAdminConfigured } from "../kol/shopify";
/** Caller has already required ingress + authenticated admin. Never mutate on GET. */
export function metaAdminGet(request: Request, path: string[]) {
  const filter = evidenceFilterSchema.parse(Object.fromEntries(new URL(request.url).searchParams));
  const db = getMetaDb(),
    now = Date.now();
  const headers = { "Cache-Control": "no-store, private", "X-Robots-Tag": "noindex, nofollow" };
  if (path.length === 3 && path[1] === "trace") {
    const trace = traceEvidence(db, z.string().uuid().parse(path[2]), filter, now);
    return Response.json(trace ?? { error: "trace_unavailable" }, {
      status: trace ? 200 : 404,
      headers,
    });
  }
  if (path.length !== 1) return Response.json({ error: "not_found" }, { status: 404, headers });
  const config = metaConfig();
  return Response.json(
    {
      ...listMetaEvents(db, filter, now),
      overview: evidenceOverview(db, filter, now),
      config: {
        enabled: config.enabled,
        pixelId: config.pixelId,
        capi: config.capi,
        catalogCount: Object.keys(config.catalogIds).length,
        testMode: !!env.META_CAPI_TEST_EVENT_CODE,
        simulation: !!env.META_TEST_ORIGIN,
        checkoutOwner: "shopify",
        ordersConfigured: shopifyAdminConfigured(),
        siteUrl: new URL(env.SITE_URL).origin,
      },
    },
    { headers },
  );
}
