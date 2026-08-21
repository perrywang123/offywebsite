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
  SITE_URL: z.string().url().default("http://localhost:3000"),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  PAYPAL_MODE: z.enum(["sandbox", "live"]).default("sandbox"),
  PAYPAL_CLIENT_ID: z.string().optional(),
  PAYPAL_CLIENT_SECRET: z.string().optional(),
});

export const env = envSchema.parse(process.env);

/** True when a value is a real secret (not a placeholder). */
function isRealSecret(v?: string): boolean {
  return Boolean(v && !v.includes("xxxx") && !v.includes("REPLACE_WITH"));
}

/** True when a real Stripe secret key is configured (not the placeholder). */
export function isStripeConfigured(): boolean {
  return isRealSecret(env.STRIPE_SECRET_KEY);
}

/** True when real PayPal credentials are configured (not placeholders). */
export function isPayPalConfigured(): boolean {
  return isRealSecret(env.PAYPAL_CLIENT_ID) && isRealSecret(env.PAYPAL_CLIENT_SECRET);
}
