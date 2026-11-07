import type { ShopifyRequestContext } from "@shopify/hydrogen";
import { env, shopifyOrigin } from "../../../lib/env";
import { observeCheckout, type CheckoutObserver } from "@/lib/checkout-diagnostics";

export class ShopifyError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
  }
}

export interface ShopifyCart {
  id: string;
  checkoutUrl: string;
}

export interface CartLineInput {
  merchandiseId: string;
  quantity: number;
}

/** Storefront GraphQL endpoint, e.g. https://xxx.myshopify.com/api/2026-07/graphql.json */
export function storefrontEndpoint(): string {
  return `${shopifyOrigin()}/api/${env.SHOPIFY_API_VERSION}/graphql.json`;
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

async function storefrontFetch<T>(
  query: string,
  variables: Record<string, unknown>,
  fetchImpl: typeof fetch = fetch,
  observer?: CheckoutObserver,
  context?: ShopifyRequestContext,
): Promise<T> {
  const startedAt = Date.now();
  let res: Response;
  const headers = new Headers({
    "Content-Type": "application/json",
    "X-Shopify-Storefront-Access-Token": env.SHOPIFY_STOREFRONT_TOKEN ?? "",
  });
  context?.applyStorefrontRequestHeaders(headers);
  if (context && env.SHOPIFY_STOREFRONT_ID)
    headers.set("Shopify-Storefront-Id", env.SHOPIFY_STOREFRONT_ID);
  try {
    res = await fetchImpl(storefrontEndpoint(), {
      method: "POST",
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
      headers,
      body: JSON.stringify({ query, variables }),
    });
  } catch (error) {
    observeCheckout(observer, {
      type: "shopify_transport_failed",
      data: {
        reason:
          error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name)
            ? "timeout"
            : "network_error",
        durationMs: Date.now() - startedAt,
      },
    });
    throw error;
  }
  context?.captureSubrequestHeaders(res.headers);
  const raw = await res.text().catch(() => "");
  let json: GraphQLResponse<T> | null;
  try {
    json = JSON.parse(raw) as GraphQLResponse<T>;
  } catch {
    json = null;
  }
  observeCheckout(observer, {
    type: "shopify_response",
    data: {
      status: res.status,
      contentType: res.headers.get("content-type"),
      requestId: res.headers.get("x-request-id"),
      durationMs: Date.now() - startedAt,
      body: json ?? { invalidJson: true },
      ...(json ? {} : { rawText: raw.slice(0, 4096), rawTextTruncated: raw.length > 4096 }),
    },
  });
  if (!res.ok) throw new ShopifyError("storefront_request_failed", res.status);
  if (!json) throw new ShopifyError("storefront_invalid_response");
  if (json.errors && json.errors.length > 0) {
    throw new ShopifyError(json.errors[0]?.message ?? "storefront_graphql_error");
  }
  if (!json.data) throw new ShopifyError("storefront_empty_response");
  return json.data;
}

/** Current query interpolates only normalized country enum values. */
function marketCountry(): string {
  const c = env.SHOPIFY_MARKET_COUNTRY;
  return /^[A-Z]{2}$/.test(c) ? c : "US";
}

/** 归一化国家码:非两位大写字母一律回落到 SHOPIFY_MARKET_COUNTRY。 */
function normalizeCountry(country: string): string {
  const cc = country.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(cc) ? cc : marketCountry();
}

/** 站点语言 → Storefront 的 LanguageCode 枚举字面量。 */
export type CartLanguage = "en" | "zh";

function languageCode(language: CartLanguage): string {
  return language === "zh" ? "ZH_CN" : "EN";
}

// buyerIdentity.countryCode 驱动 Shopify Markets 的 presentment 币种:必须传
// **访客所在国家**,与站上展示价格用的是同一个市场(US→USD、GB→GBP、
// HK→HKD、JP/DE→SGD)。此前这里固定用 SHOPIFY_MARKET_COUNTRY(=US),于是英国
// 访客在站上看到 £37.90、点结算却被送到美元结账页,金额与站上不一致。
// language 也必须显式给:不给就用店铺默认语言 —— 实测该店默认是中文,于是英文站的顾客
// 会被送到一个纯中文的结账页(标题「结账」、字段「联系方式/配送/发货方式」)。
/** 导出仅为单测断言:国家必须是访客国家,且同时进 @inContext 与 buyerIdentity。 */
export function cartMutation(country: string, language: CartLanguage): string {
  return `
mutation CartCreate($lines: [CartLineInput!]!, $attributes: [AttributeInput!], $discountCodes: [String!]) @inContext(country: ${country}, language: ${languageCode(language)}) {
  cartCreate(input: { lines: $lines, buyerIdentity: { countryCode: ${country} }, attributes: $attributes, discountCodes: $discountCodes }) {
    cart {
      id checkoutUrl totalQuantity
      discountCodes { code applicable }
      buyerIdentity { countryCode }
      cost { subtotalAmount { amount currencyCode } totalAmount { amount currencyCode } }
      lines(first: 250) {
        nodes {
          id quantity
          merchandise { ... on ProductVariant { id title sku product { handle title } } }
          cost { amountPerQuantity { amount currencyCode } totalAmount { amount currencyCode } }
        }
        pageInfo { hasNextPage endCursor }
      }
    }
    userErrors { code field message }
    warnings { code message target }
  }
}`;
}

interface CartCreateData {
  cartCreate: {
    cart: ShopifyCart | null;
    userErrors: Array<{ field?: string[]; message: string }>;
  };
}

/**
 * Create a Shopify cart in the **visitor's market** and return its checkoutUrl.
 *
 * @param country ISO-3166 alpha-2 of the visitor; omitted → `SHOPIFY_MARKET_COUNTRY`.
 *                Invalid values fall back to the default market rather than
 *                being interpolated into the GraphQL enum literal.
 * @param returnUrl 订单完成后希望顾客回到的站内地址。CartInput 没有 returnUrl
 *                字段,所以走官方支持的 `attributes`(已用本店 Storefront 探针
 *                验证 `attributes: [AttributeInput!]` 在本 schema 上存在);
 *                商家/后台据此配置回跳,落点页 `/checkout/return` 负责清空袋子。
 */
export async function cartCreate(
  lines: CartLineInput[],
  fetchImpl: typeof fetch = fetch,
  language: CartLanguage = "en",
  country: string = marketCountry(),
  returnUrl?: string,
  referralReference?: string,
  observer?: CheckoutObserver,
  collabs?: { context: ShopifyRequestContext; discountCode?: string },
): Promise<ShopifyCart> {
  const attributes = returnUrl ? [{ key: "return_url", value: returnUrl }] : [];
  if (referralReference) attributes.push({ key: "offy_ref", value: referralReference });
  const normalized = normalizeCountry(country);
  observeCheckout(observer, {
    type: "shopify_request",
    data: {
      apiVersion: env.SHOPIFY_API_VERSION,
      shop: env.SHOPIFY_STORE_DOMAIN,
      country: normalized,
      language: languageCode(language),
      lines,
      discountCodes: collabs?.discountCode ? [collabs.discountCode] : [],
      attributes: attributes.map((a) =>
        a.key === "offy_ref" ? { key: a.key, value: "[redacted]" } : a,
      ),
    },
  });
  const data = await storefrontFetch<CartCreateData>(
    cartMutation(normalized, language),
    { lines, attributes, discountCodes: collabs?.discountCode ? [collabs.discountCode] : [] },
    fetchImpl,
    observer,
    collabs?.context,
  );
  const { cart, userErrors } = data.cartCreate;
  if (userErrors && userErrors.length > 0) {
    throw new ShopifyError(userErrors[0]?.message ?? "cart_user_error");
  }
  if (!cart?.checkoutUrl) throw new ShopifyError("cart_missing_checkout_url");
  return cart;
}
