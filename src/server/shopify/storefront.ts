import { z } from "zod";
import { env, shopifyOrigin } from "../../lib/env";

export class CatalogUnavailableError extends Error {
  constructor() {
    super("catalog_unavailable");
    this.name = "CatalogUnavailableError";
  }
}

export function normalizeCountry(country = env.SHOPIFY_MARKET_COUNTRY): string {
  const cc = country.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(cc) ? cc : "US";
}

/** No persistent data cache: an outage must never serve a previous product or price. */
export async function storefrontRequest(
  key: string,
  query: string,
  variables: Record<string, unknown>,
  fetchImpl: typeof fetch,
): Promise<unknown> {
  try {
    if (fetchImpl === fetch && (!env.SHOPIFY_STORE_DOMAIN || !env.SHOPIFY_STOREFRONT_TOKEN)) {
      throw new CatalogUnavailableError();
    }
    const res = await fetchImpl(
      `${shopifyOrigin()}/api/${env.SHOPIFY_API_VERSION}/graphql.json?ck=${key}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Storefront-Access-Token": env.SHOPIFY_STOREFRONT_TOKEN ?? "",
        },
        body: JSON.stringify({ query, variables }),
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      },
    );
    if (!res.ok) throw new CatalogUnavailableError();
    const envelope = z
      .object({ data: z.unknown(), errors: z.array(z.unknown()).optional() })
      .parse(await res.json());
    if (envelope.errors?.length || !envelope.data) throw new CatalogUnavailableError();
    return envelope.data;
  } catch (error) {
    if (env.NODE_ENV === "development")
      console.warn("Shopify read unavailable", {
        query: key,
        error: error instanceof Error ? error.name : "unknown",
      });
    throw new CatalogUnavailableError();
  }
}

export const moneySchema = z.object({
  amount: z
    .string()
    .regex(/^\d+(?:\.\d+)?$/)
    .refine((v) => Number.isSafeInteger(Math.round(Number(v) * 100))),
  currencyCode: z.string().regex(/^[A-Z]{3}$/),
});
export function money(value: z.infer<typeof moneySchema>) {
  return { priceCents: Math.round(Number(value.amount) * 100), currency: value.currencyCode };
}
export const pageInfoSchema = z.object({
  hasNextPage: z.boolean(),
  endCursor: z.string().nullable(),
});
export const membershipSchema = z
  .object({
    nodes: z.array(z.object({ handle: z.string().min(1) })),
    pageInfo: pageInfoSchema,
  })
  .refine((c) => !c.pageInfo?.hasNextPage, "incomplete collection membership");
export function validated<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    if (env.NODE_ENV === "development")
      console.warn(
        "Invalid Shopify response fields",
        result.error.issues.map((i) => i.path.join(".")),
      );
    throw new CatalogUnavailableError();
  }
  return result.data;
}
