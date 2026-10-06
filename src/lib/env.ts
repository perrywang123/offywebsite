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
  SHOPIFY_STORE_DOMAIN: z.string().optional(),
  SHOPIFY_STOREFRONT_TOKEN: z.string().optional(),
  SHOPIFY_ADMIN_TOKEN: z.string().optional(),
  SHOPIFY_API_VERSION: z.string().default("2026-07"),
  // 用于 Shopify Markets 多币种的 presentment 市场。默认 US → 美国用户看/付 USD，
  // 结算到账仍是店铺的 payout 币种（HKD）由收单方换汇。
  SHOPIFY_MARKET_COUNTRY: z.string().default("US"),
  /**
   * 探测「区域限定」时要比对的国家列表(ISO-3166 alpha-2,逗号分隔)。
   * 留空用内置默认(公告栏主推的 6 个市场 + 常见海外市场)。
   */
  SHOPIFY_REGIONS: z.string().optional(),
});

export const env = envSchema.parse(process.env);

/**
 * True when the variable carries a usable (non-empty) value.
 *
 * 默认「配了就算启用」:只要填了非空值就认为该渠道可用。
 * 早期版本会用 `REPLACE_WITH` / `xxxx` 这类**占位符特征**去猜,于是模板里留着
 * 占位符就等价于把渠道静默关掉 —— 排障时很难发现。现在不再猜:填了就用,
 * 真填错密钥会在调用渠道时直接报错;只有**完全没配**时才自动禁用该渠道。
 */
function isConfiguredValue(v?: string): boolean {
  return Boolean(v && v.trim() !== "");
}

/** True when a Stripe secret key is configured. */
export function isStripeConfigured(): boolean {
  return isConfiguredValue(env.STRIPE_SECRET_KEY);
}

/** True when PayPal credentials are configured. */
export function isPayPalConfigured(): boolean {
  return isConfiguredValue(env.PAYPAL_CLIENT_ID) && isConfiguredValue(env.PAYPAL_CLIENT_SECRET);
}

/** True when a Shopify store domain + Storefront token are configured. */
export function isShopifyConfigured(): boolean {
  return isConfiguredValue(env.SHOPIFY_STORE_DOMAIN) && isConfiguredValue(env.SHOPIFY_STOREFRONT_TOKEN);
}
