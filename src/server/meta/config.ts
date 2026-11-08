import { env } from "@/lib/env";
import { z } from "zod";
export function metaConfig() {
  let catalogIds: Record<string, string> = {};
  try {
    catalogIds = z
      .record(z.string().max(200), z.string().min(1).max(200))
      .parse(JSON.parse(env.META_CATALOG_IDS));
  } catch {
    /* no guessed catalog IDs */
  }
  const enabled = env.META_TRACKING_ENABLED === "true" && /^\d{5,30}$/.test(env.META_PIXEL_ID);
  const capi =
    enabled &&
    env.META_CAPI_ENABLED === "true" &&
    !!env.META_CAPI_ACCESS_TOKEN?.trim() &&
    /^v\d+\.0$/.test(env.META_GRAPH_API_VERSION);
  return { enabled, pixelId: enabled ? env.META_PIXEL_ID : "", catalogIds, capi: !!capi };
}
