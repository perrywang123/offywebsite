import { createHmac } from "node:crypto";
/** Purpose separated from session signing, admin ingress and the worker credential. */
export function flowToken(signingSecret: string) {
  return createHmac("sha256", signingSecret)
    .update("offy:collabs:flow-attributed:v1")
    .digest("hex");
}
