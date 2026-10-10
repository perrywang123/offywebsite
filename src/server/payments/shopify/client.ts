import { env } from "../../../lib/env";

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
  return `https://${env.SHOPIFY_STORE_DOMAIN}/api/${env.SHOPIFY_API_VERSION}/graphql.json`;
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

async function storefrontFetch<T>(
  query: string,
  variables: Record<string, unknown>,
  fetchImpl: typeof fetch = fetch,
): Promise<T> {
  const res = await fetchImpl(storefrontEndpoint(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": env.SHOPIFY_STOREFRONT_TOKEN ?? "",
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new ShopifyError("storefront_request_failed", res.status);

  const json = (await res.json()) as GraphQLResponse<T>;
  if (json.errors && json.errors.length > 0) {
    throw new ShopifyError(json.errors[0]?.message ?? "storefront_graphql_error");
  }
  if (!json.data) throw new ShopifyError("storefront_empty_response");
  return json.data;
}

/** CountryCode 是 GraphQL 枚举，必须作为字面量注入（用变量传不生效）。仅允许两位字母。 */
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
mutation CartCreate($lines: [CartLineInput!]!) @inContext(country: ${country}, language: ${languageCode(language)}) {
  cartCreate(input: { lines: $lines, buyerIdentity: { countryCode: ${country} } }) {
    cart { id checkoutUrl }
    userErrors { field message }
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
 */
export async function cartCreate(
  lines: CartLineInput[],
  fetchImpl: typeof fetch = fetch,
  language: CartLanguage = "en",
  country: string = marketCountry(),
): Promise<ShopifyCart> {
  const data = await storefrontFetch<CartCreateData>(
    cartMutation(normalizeCountry(country), language),
    { lines },
    fetchImpl,
  );
  const { cart, userErrors } = data.cartCreate;
  if (userErrors && userErrors.length > 0) {
    throw new ShopifyError(userErrors[0]?.message ?? "cart_user_error");
  }
  if (!cart?.checkoutUrl) throw new ShopifyError("cart_missing_checkout_url");
  return cart;
}
