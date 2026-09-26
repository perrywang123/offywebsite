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

// buyerIdentity.countryCode 驱动 Shopify Markets 的 presentment 币种（US → USD）。
function cartMutation(country: string): string {
  return `
mutation CartCreate($lines: [CartLineInput!]!) @inContext(country: ${country}) {
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

/** Create a Shopify cart (in the configured market) and return its checkoutUrl. */
export async function cartCreate(
  lines: CartLineInput[],
  fetchImpl: typeof fetch = fetch,
): Promise<ShopifyCart> {
  const data = await storefrontFetch<CartCreateData>(
    cartMutation(marketCountry()),
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
