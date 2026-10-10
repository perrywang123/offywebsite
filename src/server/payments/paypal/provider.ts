import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import type { Product } from "../../../lib/catalog";
import { env, isPayPalConfigured } from "../../../lib/env";
import { getLiveProductByCode } from "../../catalog/live";
import { checkoutSessions, orders } from "../../db/schema";
import { getDb, type Db } from "../../db/client";
import { finalizeOrder } from "../../orders/order-service";
import { centsToUsdString } from "../pricing";
import type {
  CaptureRequest,
  CaptureResult,
  CompletedPayment,
  CreateCheckoutInput,
  CreateCheckoutResult,
  LineItemSnapshot,
  PaymentProvider,
  ShippingInfo,
} from "../types";
import { captureOrder, createOrder, getOrder, voidOrder } from "./client";
import { amountMatches, assertCurrencyUsd, extractApproveUrl } from "./verify";

/** 拿不到访客国家时(未配置 geo 头/直接调用)回落的市场。 */
const DEFAULT_MARKET_COUNTRY = env.SHOPIFY_MARKET_COUNTRY;

export class PayPalPaymentProvider implements PaymentProvider {
  readonly name = "paypal" as const;

  constructor(private injectedDb?: Db) {}

  private getDb(): Db {
    return this.injectedDb ?? getDb();
  }

  isConfigured(): boolean {
    return isPayPalConfigured();
  }

  async createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
    // 实时解析(getLiveProductByCode 内部已在 Shopify 不可达时自动回退本地目录),
    // 保证新上架 Shopify 商品也能走通 PayPal 结算,不需要再手动维护本地清单。
    const validItems: { product: Product; quantity: number }[] = [];
    for (const item of input.items) {
      const product = await getLiveProductByCode(item.code, input.country ?? DEFAULT_MARKET_COUNTRY);
      if (!product || !product.isAvailable || product.isQuoteOnly) {
        return { ok: false, status: 400, error: "invalid_items" };
      }
      validItems.push({ product, quantity: item.quantity });
    }
    if (validItems.length === 0) return { ok: false, status: 400, error: "invalid_request" };
    if (!this.isConfigured()) return { ok: false, status: 503, error: "paypal_unavailable" };

    // ⚠️ 未完成的多币种改造(有意留白,不静默混币):PayPal 这条通道按 USD 计价,
    // 且 capture 阶段会用 `assertCurrencyUsd` 强校验,而订单快照表还没有"下单市场
    // 币种"这一列。解析出非 USD 价格时直接拒绝,而不是把 GBP/HKD 金额标成 USD 收。
    // (2026-08 起结算渠道已确定只保留 Shopify,故这里不再扩展。)
    const nonUsd = validItems.find(({ product }) => product.currency.toUpperCase() !== "USD");
    if (nonUsd) {
      console.warn(
        `PayPalPaymentProvider: refusing to charge ${nonUsd.product.currency} as USD (code=${nonUsd.product.code}); PayPal channel is USD-only until the order snapshot records a currency.`,
      );
      return { ok: false, status: 400, error: "currency_not_supported" };
    }

    const subtotalCents = validItems.reduce((sum, { product, quantity }) => sum + product.priceCents * quantity, 0);
    const lineItems: LineItemSnapshot[] = validItems.map(({ product, quantity }) => ({
      code: product.code,
      nameEn: product.name.en,
      nameZh: product.name.zh,
      unitPriceCents: product.priceCents,
      quantity,
    }));

    const requestId = `create_${randomUUID()}`;
    const returnUrl = `${env.SITE_URL}/${input.locale}/checkout/paypal-return`;
    const cancelUrl = `${env.SITE_URL}/${input.locale}/checkout?paypal=cancelled`;

    try {
      const purchaseUnit: Record<string, unknown> = {
        reference_id: `offy-${randomUUID()}`,
        amount: { currency_code: "USD", value: centsToUsdString(subtotalCents) },
      };
      if (input.shipping) {
        purchaseUnit.shipping = {
          name: { full_name: input.shipping.fullName },
          address: {
            address_line_1: input.shipping.address1,
            admin_area_2: input.shipping.city,
            admin_area_1: input.shipping.state,
            postal_code: input.shipping.postalCode,
            country_code: input.shipping.country,
          },
        };
      }
      const order = await createOrder(
        {
          intent: "CAPTURE",
          purchase_units: [purchaseUnit],
          application_context: {
            user_action: "PAY_NOW",
            return_url: returnUrl,
            cancel_url: cancelUrl,
          },
        },
        requestId,
      );

      const approveUrl = extractApproveUrl(order.links);
      if (!approveUrl) return { ok: false, status: 502, error: "paypal_error" };

      this.getDb()
        .insert(checkoutSessions)
        .values({
          provider: "paypal",
          paypalOrderId: order.id,
          clientReferenceId: requestId,
          currency: "usd",
          lineItemsJson: JSON.stringify(lineItems),
          shippingJson: input.shipping ? JSON.stringify(input.shipping) : null,
          status: "pending",
        })
        .run();

      return {
        ok: true,
        provider: "paypal",
        redirect: {
          kind: "approve",
          orderId: order.id,
          approveUrl,
          returnUrl: `${returnUrl}?orderId=${order.id}`,
        },
      };
    } catch (error) {
      console.error("PayPal create order error:", error);
      return { ok: false, status: 502, error: "paypal_error" };
    }
  }

  async capture(req: CaptureRequest): Promise<CaptureResult> {
    const db = this.getDb();
    const session = db
      .select()
      .from(checkoutSessions)
      .where(eq(checkoutSessions.paypalOrderId, req.orderId))
      .get();
    if (!session) return { ok: false, status: 404, error: "order_not_found" };

    let lineItems: LineItemSnapshot[] = [];
    try {
      lineItems = JSON.parse(session.lineItemsJson ?? "[]") as LineItemSnapshot[];
    } catch {
      lineItems = [];
    }
    let shipping: ShippingInfo | undefined;
    try {
      shipping = session.shippingJson ? (JSON.parse(session.shippingJson) as ShippingInfo) : undefined;
    } catch {
      shipping = undefined;
    }
    const expectedTotal = lineItems.reduce((sum, it) => sum + it.unitPriceCents * it.quantity, 0);
    const expectedUsd = centsToUsdString(expectedTotal);

    const existing = db.select().from(orders).where(eq(orders.paypalOrderId, req.orderId)).get();
    if (existing) {
      return {
        ok: true,
        order: {
          orderNumber: existing.orderNumber,
          status: existing.status,
          totalCents: existing.totalCents,
          currency: existing.currency,
        },
      };
    }

    try {
      const order = await getOrder(req.orderId);
      if (order.status !== "APPROVED") return { ok: false, status: 409, error: "not_approved" };
      const amount = order.purchase_units?.[0]?.amount;
      if (!assertCurrencyUsd(amount?.currency_code) || !amountMatches(expectedUsd, amount?.value)) {
        await voidOrder(req.orderId).catch(() => {});
        return { ok: false, status: 409, error: "amount_mismatch" };
      }

      const captureRes = await captureOrder(req.orderId, `capture_${randomUUID()}`);
      if (captureRes.status !== "COMPLETED") return { ok: false, status: 502, error: "capture_failed" };
      const firstCapture = captureRes.purchase_units?.[0]?.payments?.captures?.[0];

      const payment: CompletedPayment = {
        provider: "paypal",
        providerOrderId: req.orderId,
        providerEventId: firstCapture?.id ?? `capture_${req.orderId}`,
        customerEmail: captureRes.payer?.email_address ?? session.customerEmail ?? null,
        currency: "usd",
        amountTotalCents: expectedTotal,
        amountSubtotalCents: expectedTotal,
        lineItems,
        shipping,
      };
      finalizeOrder(payment, db);

      const orderRow = db.select().from(orders).where(eq(orders.paypalOrderId, req.orderId)).get();
      if (!orderRow) return { ok: false, status: 502, error: "capture_failed" };
      return {
        ok: true,
        order: {
          orderNumber: orderRow.orderNumber,
          status: orderRow.status,
          totalCents: orderRow.totalCents,
          currency: orderRow.currency,
        },
      };
    } catch (error) {
      console.error("PayPal capture error:", error);
      return { ok: false, status: 502, error: "capture_failed" };
    }
  }

  async parseCallback(): Promise<CompletedPayment | null> {
    return null; // PayPal 主流程为同步 capture；Webhook 兜底留后续里程碑
  }
}
