import { z } from "zod";
import { isLandingPath } from "./landing-path";
export { LANDING_COOKIE, LANDING_RETENTION_DAYS } from "./landing-path";
export const landingSchema = z
  .object({
    version: z.literal(1),
    dtId: z.string().regex(/^[A-Za-z0-9_-]{1,128}$/),
    eventId: z.string().uuid(),
    path: z.string().max(512).refine(isLandingPath),
    analyticsAllowed: z.literal(true),
  })
  .strict();
export type LandingInput = z.infer<typeof landingSchema>;
