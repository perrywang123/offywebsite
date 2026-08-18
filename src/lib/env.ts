import { z } from "zod";

/**
 * Server-side environment validation. Only import this module in server code
 * (route handlers, data layer, scripts) — it reads process.env, which is not
 * populated for client bundles.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_PROVIDER: z.enum(["sqlite", "postgres"]).default("sqlite"),
  DATABASE_URL: z.string().default("./data/offy.db"),
});

export const env = envSchema.parse(process.env);
