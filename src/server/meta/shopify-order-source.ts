import { z } from "zod";
import { cleanSource, internalMetaSource, metaPaidMedia, metaPaidSources } from "@/lib/meta/events";
import { adminRequest, shopifyAdminConfigured } from "../kol/shopify";

const day = 86400000;
const orderNameQuery = `query OffyOrderName($query:String!) {
  orders(first:5,query:$query) { nodes { id name createdAt test } pageInfo { hasNextPage } }
}`;
const visitFields = "occurredAt landingPage utmParameters{source medium content}";
const orderSourceQuery = `query OffyOrderSource($id:ID!) {
  order(id:$id) {
    id name createdAt test cancelledAt displayFinancialStatus
    channelInformation { channelDefinition { channelName } displayName }
    customerJourneySummary {
      ready firstVisit { ${visitFields} } lastVisit { ${visitFields} }
      moments(first:40) {
        nodes { ... on CustomerVisit { ${visitFields} } }
        pageInfo { hasNextPage }
      }
    }
  }
}`;
const orderSummary = z.object({
  id: z.string().regex(/^gid:\/\/shopify\/Order\/\d+$/),
  name: z.string().min(1).max(100),
  createdAt: z.iso.datetime({ offset: true }),
  test: z.boolean(),
});
const visitSchema = z.object({
  occurredAt: z.iso.datetime({ offset: true }),
  landingPage: z.string().max(8192).nullish(),
  utmParameters: z
    .object({
      source: z.string().nullish(),
      medium: z.string().nullish(),
      content: z.string().nullish(),
    })
    .nullish(),
});
const journeySchema = z.object({
  ready: z.boolean(),
  firstVisit: visitSchema.nullish(),
  lastVisit: visitSchema.nullish(),
  moments: z.object({
    nodes: z.array(z.union([visitSchema, z.strictObject({})])).max(40),
    pageInfo: z.object({ hasNextPage: z.boolean() }),
  }),
});
const orderDetail = orderSummary.extend({
  cancelledAt: z.string().nullable(),
  displayFinancialStatus: z.string().max(40).nullable(),
  channelInformation: z
    .object({
      channelDefinition: z.object({ channelName: z.string().max(120) }).nullish(),
      displayName: z.string().max(120).nullish(),
    })
    .nullish(),
  customerJourneySummary: journeySchema.nullish(),
});

type AdEvidence = { id: string; at: number; source: string; medium: string };
type JourneyStatus = "complete" | "pending" | "partial" | "conflict";
export type ShopifyOrderSource =
  | {
      status: "found";
      orderId: string;
      orderName: string;
      salesChannel: string | null;
      financialStatus: string;
      canceled: boolean;
      test: boolean;
      placedAt: number;
      journey: JourneyStatus;
      hasMetaClick: boolean;
      ad: AdEvidence | null;
    }
  | { status: "not_found" | "not_configured" | "unavailable" | "outside_range" };

const orderNameKey = (name: string) => name.replace(/^#+/, "").toLowerCase();
const boundedFetch: typeof fetch = (input, init) =>
  fetch(input, {
    ...init,
    signal: AbortSignal.any([AbortSignal.timeout(5000), ...(init?.signal ? [init.signal] : [])]),
  });

function observeVisit(visit: z.infer<typeof visitSchema>) {
  let params = new URLSearchParams();
  if (visit.landingPage) {
    const url = URL.parse(visit.landingPage);
    if (url && ["https:", "http:"].includes(url.protocol)) params = url.searchParams;
  }
  for (const [key, value] of [
    ["utm_source", visit.utmParameters?.source],
    ["utm_medium", visit.utmParameters?.medium],
    ["utm_content", visit.utmParameters?.content],
  ] as const) {
    if (value) params.set(key, value);
  }
  const source = cleanSource(params.toString());
  const adId = params.getAll("ad_id");
  // A generic ID from a different source isn't evidence of a Meta advertisement.
  const platform = source.utm_source?.toLowerCase() ?? "";
  const medium = source.utm_medium?.toLowerCase() ?? "";
  const paid = metaPaidSources.includes(platform) && metaPaidMedia.includes(medium);
  return {
    internal: internalMetaSource(source),
    hasMetaClick: params.getAll("fbclid").some((id) => /^[A-Za-z0-9_-]{1,300}$/.test(id)),
    ad:
      paid && source.ad_id && adId.length < 2
        ? { id: source.ad_id, at: Date.parse(visit.occurredAt), source: platform, medium }
        : null,
  };
}

async function findOrderSummary(name: string) {
  const queryName = /^\d+$/.test(name) ? `#${name}` : name;
  const query = `name:"${queryName.replace(/[\\"():]/g, "\\$&")}"`;
  const data = await adminRequest<{ orders: unknown }>(orderNameQuery, { query }, boundedFetch);
  const { nodes, pageInfo } = z
    .object({
      nodes: z.array(orderSummary).max(5),
      pageInfo: z.object({ hasNextPage: z.boolean() }),
    })
    .parse(data.orders);
  const matches = nodes.filter((node) => orderNameKey(node.name) === orderNameKey(name));
  if (pageInfo.hasNextPage || matches.length > 1) throw new Error("order_search_ambiguous");
  return matches[0];
}

function journeyEvidence(
  journey: z.infer<typeof journeySchema> | null | undefined,
  placedAt: number,
) {
  if (!journey?.ready)
    return {
      journey: journey ? ("pending" as const) : ("partial" as const),
      hasMetaClick: false,
      ad: null,
    };
  const visits = [journey.firstVisit, ...journey.moments.nodes, journey.lastVisit]
    .filter((visit) => visit && "occurredAt" in visit && Date.parse(visit.occurredAt) <= placedAt)
    .map((visit) => observeVisit(visit as z.infer<typeof visitSchema>));
  const ads = visits.flatMap((visit) => (visit.ad ? [visit.ad] : []));
  const ids = new Set(ads.map((ad) => ad.id));
  const state: JourneyStatus = journey.moments.pageInfo.hasNextPage
    ? "partial"
    : ids.size > 1
      ? "conflict"
      : "complete";
  return {
    internal: visits.some((visit) => visit.internal),
    journey: state,
    hasMetaClick: visits.some((visit) => visit.hasMetaClick),
    ad: state === "complete" ? (ads.sort((a, b) => b.at - a.at)[0] ?? null) : null,
  };
}

/** Called only for an authenticated, exact order search. No raw visit data leaves this function. */
export async function lookupShopifyOrderSource(
  name: string,
  localId: string | undefined,
  includeTests: boolean,
  now: number,
): Promise<ShopifyOrderSource> {
  if (!shopifyAdminConfigured()) return { status: "not_configured" };
  if (!name || /[\x00-\x1f\x7f]/u.test(name)) return { status: "not_found" };
  try {
    const summary = localId ? undefined : await findOrderSummary(name);
    const id = localId ?? summary?.id;
    if (!id || (summary?.test && !includeTests)) return { status: "not_found" };
    if (summary && Date.parse(summary.createdAt) < now - 30 * day)
      return { status: "outside_range" };
    const data = await adminRequest<{ order: unknown }>(orderSourceQuery, { id }, boundedFetch);
    if (!data.order) return { status: "not_found" };
    const order = orderDetail.parse(data.order);
    if (order.id !== id || orderNameKey(order.name) !== orderNameKey(name))
      return { status: "not_found" };
    const placedAt = Date.parse(order.createdAt);
    if (placedAt < now - 30 * day) return { status: "outside_range" };
    const { internal, ...evidence } = journeyEvidence(order.customerJourneySummary, placedAt);
    const test = order.test || Boolean(internal);
    if (test && !includeTests) return { status: "not_found" };
    return {
      status: "found",
      orderId: order.id,
      orderName: order.name,
      placedAt,
      salesChannel:
        order.channelInformation?.channelDefinition?.channelName ??
        order.channelInformation?.displayName ??
        null,
      financialStatus: order.displayFinancialStatus ?? "UNKNOWN",
      canceled: !!order.cancelledAt,
      test,
      ...evidence,
    };
  } catch {
    return { status: "unavailable" };
  }
}
