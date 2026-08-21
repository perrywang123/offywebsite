import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Newsletter subscribers — brand marketing capture.
 */
export const newsletterSubscribers = sqliteTable("newsletter_subscribers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

/**
 * A Stripe Checkout Session, recorded as soon as it is created (covers the
 * "created but not yet paid" state). `providerEventId` deduplicates webhook
 * deliveries idempotently.
 */
export const checkoutSessions = sqliteTable("checkout_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  provider: text("provider").notNull().default("stripe"), // stripe | paypal
  stripeSessionId: text("stripe_session_id").unique(),
  paypalOrderId: text("paypal_order_id").unique(),
  providerEventId: text("provider_event_id").unique(),
  status: text("status").notNull().default("pending"), // pending | authorized | cancelled | failed | completed | expired
  currency: text("currency").notNull().default("usd"),
  amountTotalCents: integer("amount_total_cents"),
  customerEmail: text("customer_email"),
  clientReferenceId: text("client_reference_id"),
  /** JSON snapshot of line items at session creation (code/name/unit price/qty). */
  lineItemsJson: text("line_items_json"),
  /** JSON snapshot of shipping address at checkout. */
  shippingJson: text("shipping_json"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  completedAt: integer("completed_at", { mode: "timestamp" }),
});

/** An order, written only after a verified `checkout.session.completed` webhook. */
export const orders = sqliteTable("orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderNumber: text("order_number").notNull().unique(),
  provider: text("provider").notNull().default("stripe"), // stripe | paypal
  stripeSessionId: text("stripe_session_id").unique(),
  paypalOrderId: text("paypal_order_id").unique(),
  email: text("email").notNull(),
  customerName: text("customer_name"),
  currency: text("currency").notNull().default("usd"),
  subtotalCents: integer("subtotal_cents").notNull(),
  totalCents: integer("total_cents").notNull(),
  shippingJson: text("shipping_json"),
  status: text("status").notNull().default("paid"), // paid | refunded | failed
  paidAt: integer("paid_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

/** Order line items — snapshot product name/price at purchase time. */
export const orderItems = sqliteTable(
  "order_items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productCode: text("product_code").notNull(),
    variantCode: text("variant_code"),
    nameEn: text("name_en").notNull(),
    nameZh: text("name_zh").notNull(),
    unitPriceCents: integer("unit_price_cents").notNull(),
    quantity: integer("quantity").notNull(),
    lineTotalCents: integer("line_total_cents").notNull(),
  },
  (t) => [index("order_items_order_idx").on(t.orderId)],
);

export type NewsletterSubscriber = typeof newsletterSubscribers.$inferSelect;
export type NewNewsletterSubscriber = typeof newsletterSubscribers.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type CheckoutSession = typeof checkoutSessions.$inferSelect;
