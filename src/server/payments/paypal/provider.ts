import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { env, isPayPalConfigured } from "../../../lib/env";
import { computeSubtotalCents, getProductByCode } from "../../../lib/catalog";
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
} from "../types";
import { captureOrder, createOrder, getOrder, voidOrder } from "./client";
import { amountMatches, assertCurrencyUsd, extractApproveUrl } from "./verify";

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
    const validItems: { code: string; quantity: number }[] = [];
    for (const item of input.items) {
      const product = getProductByCode(item.code);
      if (!product || !product.isAvailable || product.isQuoteOnly) {
        return { ok: false, status: 400, error: "invalid_items" };
      }
      validItems.push({ code: product.code, quantity: item.quantity });
    }
    if (validItems.length === 0) return { ok: false, status: 400, error: "invalid_request" };
    if (!this.isConfigured()) return { ok: false, status: 503, error: "paypal_unavailable" };

    const subtotalCents = computeSubtotalCents(validItems);
    const lineItems: LineItemSnapshot[] = validItems.map((item) => {
      const p = getProductByCode(item.code)!;
      return {
        code: p.code,
        nameEn: p.name.en,
        nameZh: p.name.zh,
        unitPriceCents: p.priceCents,
        quantity: item.quantity,
      };
    });

    const requestId = `create_${randomUUID()}`;
    const returnUrl = `${env.SITE_URL}/${input.locale}/checkout/paypal-return`;
    const cancelUrl = `${env.SITE_URL}/${input.locale}/checkout?paypal=cancelled`;

    try {
      const order = await createOrder(
        {
          intent: "CAPTURE",
          purchase_units: [
            {
              reference_id: `offy-${randomUUID()}`,
              amount: { currency_code: "USD", value: centsToUsdString(subtotalCents) },
            },
          ],
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
