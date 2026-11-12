import { env } from "@/lib/env";
import {
  diagnosticKey,
  decryptDiagnostic,
  encryptDiagnostic,
} from "../checkout-diagnostics/crypto";
import { getLinkObservationDb } from "../collabs/link-db";
import { metaConfig } from "./config";
import { claimJobs, finishJob } from "./store";
import { deliver } from "./transport";
import { z } from "zod";
import { checkoutReference } from "./reference";
export const getMetaDb = getLinkObservationDb;
export function marketingCheckoutReference(attemptId?: string) {
  try {
    return metaConfig().enabled && attemptId
      ? checkoutReference(attemptId, diagnosticKey())
      : undefined;
  } catch {
    return;
  }
}
export function checkoutMetaReceipt(attemptId?: string) {
  try {
    return metaConfig().enabled && attemptId
      ? encryptDiagnostic(
          { attemptId, expires: Date.now() + 10 * 60000 },
          diagnosticKey(),
          "meta-checkout",
        )
      : undefined;
  } catch {
    return;
  }
}
export function receiptAttempt(receipt?: string) {
  try {
    const data = z
      .object({ attemptId: z.string().uuid(), expires: z.number() })
      .parse(decryptDiagnostic(receipt ?? "", diagnosticKey(), "meta-checkout"));
    return data.expires >= Date.now() ? data.attemptId : undefined;
  } catch {
    return;
  }
}
export function metaTestOrigin() {
  if (!env.META_TEST_ORIGIN) return;
  const url = new URL(env.META_TEST_ORIGIN);
  if (
    env.NODE_ENV === "production" ||
    env.OFFY_INTEGRATION_TEST !== "true" ||
    !["127.0.0.1", "localhost"].includes(url.hostname) ||
    !["127.0.0.1", "localhost"].includes(new URL(env.SITE_URL).hostname)
  )
    throw new Error("unsafe_meta_test_origin");
  return url.origin;
}
export async function runMetaWorker() {
  const config = metaConfig();
  if (!config.capi) return { state: "unconfigured", processed: 0 };
  const db = getMetaDb(),
    key = diagnosticKey(),
    jobs = claimJobs(db);
  for (const job of jobs) {
    try {
      const result = await deliver(decryptDiagnostic(job.payload!, key, job.id), {
        endpoint: `${metaTestOrigin() ?? "https://graph.facebook.com"}/${env.META_GRAPH_API_VERSION}/${config.pixelId}/events`,
        token: env.META_CAPI_ACCESS_TOKEN!,
        testCode: env.META_CAPI_TEST_EVENT_CODE,
      });
      finishJob(db, job, result);
    } catch {
      finishJob(db, job, { ok: false, error: "payload_unavailable" });
    }
  }
  return { state: "ready", processed: jobs.length };
}
