import { env } from "../../lib/env";
import { sanitizePolicyHtml } from "../../lib/sanitize";
import { ShopifyError } from "../payments/shopify/client";

/**
 * 「书面政策」数据层 —— 正文来自 Shopify 后台 设置 → 书面政策。
 *
 * 实测结论(用现有 Storefront token 验证过,无需任何新权限):
 *   · shop.privacyPolicy / refundPolicy / shippingPolicy / termsOfService
 *     四个字段能直接拿到干净 HTML 正文(每个 1.2 万~3.7 万字符)
 *   · `@inContext(language: ZH_CN)` 切不了语言 —— 政策正文的翻译要在 Shopify 的
 *     Translate & Adapt 里单独配,目前没配,所以**只有英文原文**
 *   · **联系信息(contact-information)Storefront API 没有对应字段**,后台配了也读不到,
 *     因此这里用站内静态文案(由业务方提供)
 *   · 后台「法律声明」未设置,公开页 /policies/legal-notice 返回 404 → 本站不做这一项
 *
 * 正文一律过 sanitizePolicyHtml:后台富文本直接 dangerouslySetInnerHTML 等于开一条
 * XSS 通道,详见 lib/sanitize.ts。
 */

/**
 * 政策顺序 = 页脚展示顺序(退货退款 → 隐私 → 条款 → 物流 → 联系信息)。
 *
 * URL 用自己的短 handle,不沿用 Shopify 的 `refund-policy` 这类原样 handle:
 * 那是 Shopify 的词汇表,以后可能变;把它写进对外 URL 等于把外部契约焊死在我们
 * 的路由上。实测政策 API 返回的 `url` 也不是店铺公开页(而是 checkout.shopify.com
 * 域的副本),所以"跟 Shopify 公开页保持一致"这个收益本来就不存在。
 */
export const POLICY_HANDLES = ["returns", "privacy", "terms", "shipping", "contact"] as const;

export type PolicyHandle = (typeof POLICY_HANDLES)[number];

/** Shopify Storefront 上取得到的四个政策 → GraphQL 字段名。 */
const SHOPIFY_POLICY_FIELD: Partial<Record<PolicyHandle, string>> = {
  returns: "refundPolicy",
  privacy: "privacyPolicy",
  terms: "termsOfService",
  shipping: "shippingPolicy",
};

/**
 * 联系信息:Storefront API 读不到,由业务方提供,站内静态维护。
 * 实体/注册地址/客服邮箱/Instagram 拆成结构化字段,便于按条目排版;
 * intro / note 是原文里的首尾说明段。
 */
export interface ContactRow {
  label: { zh: string; en: string };
  value: string;
  /** 有 href 的字段渲染成链接(mailto / 外链);没有的渲染成纯文本。 */
  href?: string;
}

export const CONTACT_INFO: {
  intro: string;
  rows: ContactRow[];
  note: string;
} = {
  intro:
    "If you have any questions, feedback, or notices concerning these Terms, our policies, or any order, please reach out to us at:",
  rows: [
    { label: { zh: "公司实体", en: "Entity" }, value: "Whimcore Cultural Creative Co., Limited (Company No. 81264514)" },
    {
      label: { zh: "注册地址", en: "Registered Office" },
      value: "Unit B32, 11/F., Wong King Industrial Building, No. 2 Tai Yau Street, San Po Kong, Hong Kong",
    },
    {
      label: { zh: "客服邮箱", en: "Customer Support Email" },
      value: "contact@whimcoreofficial.com",
      href: "mailto:contact@whimcoreofficial.com",
    },
    {
      label: { zh: "官方 Instagram", en: "Official Instagram" },
      // 账号名带点:@is.offy(与 products.ts 的 "Follow @is.offy" 一致;
      // 最初按业务方粘贴的 @isoffy 录入,已确认正确写法是 @is.offy)
      value: "@is.offy",
      href: "https://www.instagram.com/is.offy",
    },
  ],
  note:
    "(Please include your order number and full name in all order-related correspondence so we can assist you promptly. Responses are typically provided within 24–48 business hours.)",
};

export interface Policy {
  handle: PolicyHandle;
  /** 已消毒的 HTML 正文;null = Shopify 不可达(页面据此显示兜底提示)。 */
  bodyHtml: string | null;
  /** shopify = 后台实时拉取;static = 站内静态(联系信息)。 */
  source: "shopify" | "static";
}

/**
 * 展示名(中文名/英文名)统一放 i18n 的 `policies.titles.<handle>`,
 * 不在本模块再存一份 —— 页脚与正文页必须显示同一个名字,两处维护必然会漂。
 */
export function isPolicyHandle(value: string): value is PolicyHandle {
  return (POLICY_HANDLES as readonly string[]).includes(value);
}

interface ShopPolicyNode {
  title?: string | null;
  body?: string | null;
}

/**
 * 一次往返取回四个政策正文(Storefront `shop` 上的四个字段)。
 * 失败时抛错,由调用方决定兜底 —— 与 catalog.ts 的约定一致。
 */
async function fetchShopifyPolicies(
  fetchImpl: typeof fetch = fetch,
): Promise<Partial<Record<PolicyHandle, string>>> {
  const fields = Object.entries(SHOPIFY_POLICY_FIELD)
    .map(([, field]) => `${field} { title body }`)
    .join("\n    ");

  const res = await fetchImpl(
    `https://${env.SHOPIFY_STORE_DOMAIN}/api/${env.SHOPIFY_API_VERSION}/graphql.json?ck=shop-policies`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": env.SHOPIFY_STOREFRONT_TOKEN ?? "",
      },
      body: JSON.stringify({ query: `{ shop { ${fields} } }` }),
      // 政策极少改;300s 让 zh/en 共享同一份缓存(正文与语言无关),后台改完 5 分钟内生效
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(5000),
    } as RequestInit,
  );

  if (!res.ok) throw new ShopifyError(`policy query failed: HTTP ${res.status}`);
  const json = (await res.json()) as {
    data?: { shop?: Record<string, ShopPolicyNode | null> };
    errors?: unknown;
  };
  if (json.errors) throw new ShopifyError(`policy query errors: ${JSON.stringify(json.errors).slice(0, 300)}`);

  const shop = json.data?.shop ?? {};
  const out: Partial<Record<PolicyHandle, string>> = {};
  for (const [handle, field] of Object.entries(SHOPIFY_POLICY_FIELD) as Array<[PolicyHandle, string]>) {
    const body = shop[field]?.body;
    if (body) out[handle] = sanitizePolicyHtml(body);
  }
  return out;
}

/**
 * 取单个政策。联系信息直接返回静态内容;其余四个走 Shopify,
 * 不可达时 `bodyHtml` 为 null(页面据此显示兜底提示,不白屏)。
 */
export async function getPolicy(handle: PolicyHandle, fetchImpl: typeof fetch = fetch): Promise<Policy> {
  if (handle === "contact") {
    return { handle, bodyHtml: null, source: "static" };
  }
  try {
    const bodies = await fetchShopifyPolicies(fetchImpl);
    return { handle, bodyHtml: bodies[handle] ?? null, source: "shopify" };
  } catch {
    return { handle, bodyHtml: null, source: "shopify" };
  }
}
