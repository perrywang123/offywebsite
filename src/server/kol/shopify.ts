import { env, shopifyOrigin } from "@/lib/env";
import type { CodeGateway, RemoteCode, Campaign } from "./codes";
import { z } from "zod";
export async function adminRequest<T>(
  query: string,
  variables: Record<string, unknown> = {},
  fetchImpl: typeof fetch = fetch,
): Promise<T> {
  if (!env.SHOPIFY_ADMIN_TOKEN || !env.SHOPIFY_STORE_DOMAIN)
    throw new Error("shopify_admin_not_configured");
  const response = await fetchImpl(
    `${shopifyOrigin()}/admin/api/${env.SHOPIFY_API_VERSION}/graphql.json`,
    {
      method: "POST",
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": env.SHOPIFY_ADMIN_TOKEN,
      },
      body: JSON.stringify({ query, variables }),
    },
  );
  if (!response.ok) throw new Error(`shopify_admin_http_${response.status}`);
  const body = await response.json();
  if (body.errors?.length) throw new Error("shopify_admin_graphql_error");
  if (!body.data) throw new Error("shopify_admin_empty");
  return body.data as T;
}
const discountFragments = `__typename
 ... on DiscountCodeBasic { title status summary startsAt endsAt }
 ... on DiscountCodeBxgy { title status summary startsAt endsAt }
 ... on DiscountCodeFreeShipping { title status summary startsAt endsAt }
 ... on DiscountCodeApp { title status startsAt endsAt }`;
const discountSchema = z.object({
  id: z.string(),
  codeDiscount: z.object({
    __typename: z.string(),
    title: z.string(),
    status: z.string(),
    summary: z.string().optional(),
    startsAt: z.string().optional(),
    endsAt: z.string().nullable().optional(),
  }),
});
function campaign(node: z.infer<typeof discountSchema>): Campaign {
  const d = node.codeDiscount;
  return {
    id: node.id,
    type: d.__typename,
    title: d.title,
    status: d.status,
    summary: [
      d.title,
      d.summary ?? "应用优惠：请到Shopify查看完整规则",
      d.endsAt ? `截止 ${d.endsAt}` : "无固定截止日期",
      "共享活动规则与额度，以Shopify结账为准",
    ].join(" · "),
  };
}
export const codeGateway: CodeGateway = {
  shop: env.SHOPIFY_STORE_DOMAIN ?? "",
  scopes: async () => {
    const data = await adminRequest<{
      currentAppInstallation: { accessScopes: Array<{ handle: string }> };
    }>(`query OffyScopes { currentAppInstallation { accessScopes { handle } } }`);
    return data.currentAppInstallation.accessScopes.map((s) => s.handle);
  },
  lookup: async (code) => {
    const data = await adminRequest<{ codeDiscountNodeByCode: unknown }>(
      `query OffyCode($code:String!){ codeDiscountNodeByCode(code:$code){ id codeDiscount { ${discountFragments} } } }`,
      { code },
    );
    if (!data.codeDiscountNodeByCode) return null;
    const c = campaign(discountSchema.parse(data.codeDiscountNodeByCode));
    return { ...c, code } satisfies RemoteCode;
  },
  campaign: async (id) => {
    const data = await adminRequest<{ codeDiscountNode: unknown }>(
      `query OffyCampaign($id:ID!){codeDiscountNode(id:$id){id codeDiscount {${discountFragments}}}}`,
      { id },
    );
    return data.codeDiscountNode ? campaign(discountSchema.parse(data.codeDiscountNode)) : null;
  },
  add: async (id, code) => {
    const data = await adminRequest<{
      discountRedeemCodeBulkAdd: {
        bulkCreation: { id: string } | null;
        userErrors: Array<{ message: string }>;
      };
    }>(
      `mutation OffyAddCode($discountId:ID!,$codes:[DiscountRedeemCodeInput!]!){discountRedeemCodeBulkAdd(discountId:$discountId,codes:$codes){bulkCreation{id}userErrors{message}}}`,
      { discountId: id, codes: [{ code }] },
    );
    if (
      data.discountRedeemCodeBulkAdd.userErrors.length ||
      !data.discountRedeemCodeBulkAdd.bulkCreation
    )
      throw new Error("shopify_code_rejected");
    return data.discountRedeemCodeBulkAdd.bulkCreation.id;
  },
  poll: async (id) => {
    const data = await adminRequest<{
      discountRedeemCodeBulkCreation: {
        done: boolean;
        failedCount: number;
        codes: { nodes: Array<{ code: string; errors: Array<{ message: string }> }> };
      };
    }>(
      `query OffyCodeJob($id:ID!){discountRedeemCodeBulkCreation(id:$id){done failedCount codes(first:10){nodes{code errors{message}}}}}`,
      { id },
    );
    const j = data.discountRedeemCodeBulkCreation;
    if (!j) throw new Error("remote_job_missing");
    return { ...j, codes: j.codes.nodes };
  },
};
export async function campaigns() {
  const result = await adminRequest<{
    codeDiscountNodes: { nodes: unknown[]; pageInfo: { hasNextPage: boolean } };
  }>(
    `query OffyCampaigns {codeDiscountNodes(first:100,query:"status:active"){nodes{id codeDiscount{${discountFragments}}}pageInfo{hasNextPage}}}`,
  );
  return {
    nodes: result.codeDiscountNodes.nodes.map((n) => campaign(discountSchema.parse(n))),
    truncated: result.codeDiscountNodes.pageInfo.hasNextPage,
  };
}
const m = `{ presentmentMoney { amount currencyCode } }`,
  page = `pageInfo{hasNextPage}`;
export const ORDER_QUERY = `query OffyOrder($id:ID!){order(id:$id){
 id name cartToken customAttributes{key value} presentmentCurrencyCode taxesIncluded edited cancelledAt displayFinancialStatus disputes{status}
 totalPriceSet ${m} totalOutstandingSet ${m}
 transactions(first:100){id kind status processedAt amountSet ${m}}
 lineItems(first:250){nodes{id isGiftCard quantity originalTotalSet ${m} discountAllocations{allocatedAmountSet ${m}} taxLines{priceSet ${m}}}${page}}
 refunds { id totalRefundedSet ${m}
 transactions(first:100){nodes{id kind status processedAt amountSet ${m}}${page}}
 refundLineItems(first:250){nodes{lineItem{id isGiftCard} quantity subtotalSet ${m} totalTaxSet ${m}}${page}}
 refundShippingLines(first:100){nodes{subtotalAmountSet ${m} taxAmountSet ${m}}${page}}
 orderAdjustments(first:100){nodes{id}${page}}
 }
}}`;
export async function fetchOrder(id: string) {
  const data = await adminRequest<{ order: unknown }>(ORDER_QUERY, { id });
  if (!data.order) throw new Error("order_unavailable_or_scope");
  return data.order;
}
export async function fetchOrderPage(since: string, after: string | null) {
  return adminRequest<{
    orders: {
      nodes: Array<{ id: string }>;
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
    };
  }>(
    `query OffyOrders($query:String!,$after:String){orders(first:50,sortKey:UPDATED_AT,query:$query,after:$after){nodes{id}pageInfo{hasNextPage endCursor}}}`,
    { query: `updated_at:>=${since}`, after },
  );
}
