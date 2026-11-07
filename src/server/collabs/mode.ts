import { env } from "@/lib/env";
export function collabsMode() {
  return env.KOL_ACCOUNTING_MODE === "collabs";
}
export function requireOffyAccounting() {
  if (collabsMode()) throw new Error("collabs_managed");
}
