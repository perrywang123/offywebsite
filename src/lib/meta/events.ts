import { z } from "zod";

// InitiateCheckout is retained for old clients/history; Shopify owns Meta delivery.
export const eventNames = [
  "PageView",
  "ViewContent",
  "AddToCart",
  "CheckoutReady",
  "InitiateCheckout",
] as const;
export type MetaName = (typeof eventNames)[number];
export const browserMetaEvent = (name: MetaName) =>
  ["PageView", "ViewContent", "AddToCart"].includes(name);
export const capiMetaEvent = (name: string) => name === "AddToCart";
export const checkoutObservation = (name: string) =>
  name === "CheckoutReady" || name === "InitiateCheckout";
const label = z
  .string()
  .max(120)
  .regex(/^[\p{L}\p{N}_. -]*$/u);
export const sourceSchema = z
  .object({
    utm_source: label.optional(),
    utm_medium: label.optional(),
    utm_campaign: label.optional(),
    utm_content: label.optional(),
    utm_term: label.optional(),
    campaign_id: label.optional(),
    adset_id: label.optional(),
    ad_id: label.optional(),
  })
  .strict();
export const dataSchema = z
  .object({
    content_name: z.string().max(200).optional(),
    content_type: z.literal("product").optional(),
    content_ids: z.array(z.string().min(1).max(200)).max(50).optional(),
    num_items: z.number().int().min(1).max(5000).optional(),
    currency: z
      .string()
      .regex(/^[A-Z]{3}$/)
      .optional(),
    value: z.number().finite().nonnegative().max(10000000).optional(),
  })
  .strict();
export const eventSchema = z
  .object({
    eventId: z.string().uuid(),
    visitorId: z.string().uuid(),
    name: z.enum(eventNames),
    occurredAt: z.number().int().positive(),
    pagePath: z
      .string()
      .max(300)
      .regex(/^\/(?!\/)[A-Za-z0-9/_%.-]*$/),
    source: sourceSchema,
    data: dataSchema,
    consent: z.literal(true),
    fbp: z
      .string()
      .max(255)
      .regex(/^fb\.\d+\.\d+\.[A-Za-z0-9_-]+$/)
      .optional(),
    fbc: z
      .string()
      .max(500)
      .regex(/^fb\.\d+\.\d+\.[A-Za-z0-9_-]+$/)
      .optional(),
    checkoutReceipt: z.string().max(1500).optional(),
    pixelAttempted: z.boolean().optional(),
  })
  .strict();
export type MetaEvent = z.infer<typeof eventSchema>;
export const checkoutContextSchema = eventSchema
  .pick({ visitorId: true, pagePath: true, source: true, data: true, fbp: true, fbc: true })
  .strict();
export interface Privacy {
  analyticsProcessingAllowed?: () => boolean;
  marketingAllowed?: () => boolean;
  saleOfDataAllowed?: () => boolean;
}
export function marketingAllowed(privacy: Privacy | undefined, gpc: boolean) {
  try {
    return (
      !gpc &&
      privacy?.analyticsProcessingAllowed?.() === true &&
      privacy.marketingAllowed?.() === true &&
      privacy.saleOfDataAllowed?.() === true
    );
  } catch {
    return false;
  }
}
export function cleanSource(search: string): z.infer<typeof sourceSchema> {
  const params = new URLSearchParams(search),
    output: Record<string, string> = {};
  for (const key of Object.keys(sourceSchema.shape)) {
    const value = params.get(key);
    if (value && label.safeParse(value).success) output[key] = value;
  }
  return output;
}
export interface MetaProduct {
  code: string;
  quantity: number;
  priceCents?: number;
  currency?: string;
}
export function productData(items: MetaProduct[], mapping: Record<string, string>) {
  const data: z.infer<typeof dataSchema> = {};
  if (!items.length) return data;
  data.num_items = items.reduce((n, i) => n + i.quantity, 0);
  const ids = items.map((i) => mapping[i.code]);
  if (ids.every(Boolean)) {
    data.content_ids = ids;
    data.content_type = "product";
  }
  const currency = items[0].currency?.toUpperCase();
  if (
    currency &&
    /^[A-Z]{3}$/.test(currency) &&
    items.every(
      (i) =>
        i.currency?.toUpperCase() === currency &&
        Number.isSafeInteger(i.priceCents) &&
        i.priceCents! >= 0,
    )
  ) {
    const total = items.reduce((n, i) => n + i.priceCents! * i.quantity, 0);
    if (Number.isSafeInteger(total)) {
      data.value = total / 100;
      data.currency = currency;
    }
  }
  return dataSchema.parse(data);
}
