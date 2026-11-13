import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

/** Marketing observations, never proof of Meta attribution. */
export const metaEvents = sqliteTable(
  "meta_events",
  {
    id: text("id").primaryKey(),
    visitorHash: text("visitor_hash").notNull(),
    name: text("name").notNull(),
    createdAt: integer("created_at").notNull(),
    pagePath: text("page_path").notNull(),
    sourceJson: text("source_json").notNull(),
    dataJson: text("data_json").notNull(),
    attemptId: text("attempt_id"),
    hasFbc: integer("has_fbc", { mode: "boolean" }).notNull(),
    hasFbp: integer("has_fbp", { mode: "boolean" }).notNull(),
    pixelAttempted: integer("pixel_attempted", { mode: "boolean" }).notNull(),
    status: text("status").notNull(),
    payload: text("payload"),
    attempts: integer("attempts").notNull().default(0),
    dueAt: integer("due_at").notNull(),
    leaseUntil: integer("lease_until").notNull().default(0),
    leaseToken: text("lease_token"),
    lastError: text("last_error"),
    sentAt: integer("sent_at"),
  },
  (t) => [
    index("meta_due_idx").on(t.status, t.dueAt),
    index("meta_visitor_idx").on(t.visitorHash),
    index("meta_created_idx").on(t.createdAt),
  ],
);

/** Minimal read-only Shopify facts linked to consented checkout observations. */
export const metaOrderEvidence = sqliteTable(
  "meta_order_evidence",
  {
    orderId: text("order_id").primaryKey(),
    orderName: text("order_name").notNull(),
    attemptId: text("attempt_id").notNull(),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
    checkedAt: integer("checked_at").notNull(),
    financialStatus: text("financial_status").notNull(),
    canceled: integer("canceled", { mode: "boolean" }).notNull(),
    test: integer("test", { mode: "boolean" }).notNull(),
    currency: text("currency").notNull(),
    totalMinor: integer("total_minor").notNull(),
    currentMinor: integer("current_minor").notNull(),
    refundedMinor: integer("refunded_minor").notNull(),
  },
  (t) => [
    index("meta_order_attempt_idx").on(t.attemptId),
    index("meta_order_created_idx").on(t.createdAt),
  ],
);

export const metaOrderSync = sqliteTable("meta_order_sync", {
  id: integer("id").primaryKey(),
  since: text("since_at").notNull(),
  cursor: text("cursor"),
  startedAt: integer("started_at").notNull(),
  nextAt: integer("next_at").notNull(),
  leaseUntil: integer("lease_until").notNull().default(0),
  lastSuccess: integer("last_success"),
  lastError: text("last_error"),
});

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

/** Anonymous checkout evidence, never an order or a commercial catalog fallback. */
export const checkoutAttempts = sqliteTable(
  "checkout_attempts",
  {
    id: text("id").primaryKey(),
    receiptDigest: text("receipt_digest").notNull().unique(),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
    claimedAt: integer("claimed_at"),
    status: text("status").notNull(),
    country: text("country").notNull(),
    countryJson: text("country_json").notNull(),
    itemsJson: text("items_json").notNull(),
    locale: text("locale").notNull(),
    pagePath: text("page_path").notNull(),
    error: text("error"),
    durationMs: integer("duration_ms"),
    redirectHost: text("redirect_host"),
    sensitiveJson: text("sensitive_json"),
    sensitiveExpiresAt: integer("sensitive_expires_at").notNull(),
  },
  (t) => [
    index("checkout_attempts_time_idx").on(t.createdAt),
    index("checkout_attempts_country_status_idx").on(t.country, t.status, t.createdAt),
  ],
);

export const checkoutAttemptEvents = sqliteTable(
  "checkout_attempt_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    attemptId: text("attempt_id")
      .notNull()
      .references(() => checkoutAttempts.id, { onDelete: "cascade" }),
    at: integer("at").notNull(),
    type: text("type").notNull(),
    dataJson: text("data_json").notNull(),
    sensitiveJson: text("sensitive_json"),
  },
  (t) => [index("checkout_attempt_events_attempt_idx").on(t.attemptId, t.id)],
);

// KOL accounting is independent of the legacy payment tables. Times are UTC milliseconds.
export const kolAdmins = sqliteTable("kol_admins", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: integer("created_at").notNull(),
});
export const kolAdminSessions = sqliteTable("kol_admin_sessions", {
  digest: text("digest").primaryKey(),
  adminId: text("admin_id")
    .notNull()
    .references(() => kolAdmins.id),
  expiresAt: integer("expires_at").notNull(),
});
export const kolLoginLimits = sqliteTable("kol_login_limits", {
  key: text("key").primaryKey(),
  attempts: integer("attempts").notNull(),
  resetsAt: integer("resets_at").notNull(),
});
export const kolPartners = sqliteTable("kol_partners", {
  id: text("id").primaryKey(),
  alias: text("alias").notNull().unique(),
  name: text("name").notNull(),
  status: text("status").notNull(),
  version: integer("version").notNull(),
  requests: integer("requests").notNull().default(0),
  landings: integer("landings").notNull().default(0),
  createdAt: integer("created_at").notNull(),
});
export const kolTerms = sqliteTable("kol_terms", {
  id: text("id").primaryKey(),
  kolId: text("kol_id")
    .notNull()
    .references(() => kolPartners.id),
  version: integer("version").notNull(),
  rateBps: integer("rate_bps").notNull(),
  startsAt: integer("starts_at").notNull(),
  endsAt: integer("ends_at").notNull(),
  data: text("data").notNull(),
  createdAt: integer("created_at").notNull(),
});
export const kolReferrals = sqliteTable(
  "kol_referrals",
  {
    id: text("id").primaryKey(),
    kolId: text("kol_id")
      .notNull()
      .references(() => kolPartners.id),
    createdAt: integer("created_at").notNull(),
    lastActiveAt: integer("last_active_at").notNull(),
    landedAt: integer("landed_at"),
  },
  (t) => [index("kol_referrals_time_idx").on(t.createdAt)],
);
export const kolIntents = sqliteTable("kol_intents", {
  id: text("id").primaryKey(),
  referralId: text("referral_id").notNull(),
  kolId: text("kol_id")
    .notNull()
    .references(() => kolPartners.id),
  termsId: text("terms_id")
    .notNull()
    .references(() => kolTerms.id),
  rateBps: integer("rate_bps").notNull(),
  createdAt: integer("created_at").notNull(),
  expiresAt: integer("expires_at").notNull(),
  cartToken: text("cart_token").unique(),
  orderId: text("order_id").unique(),
});
export const kolCodes = sqliteTable("kol_codes", {
  id: text("id").primaryKey(),
  shop: text("shop").notNull(),
  normalized: text("normalized").notNull().unique(),
  kolId: text("kol_id")
    .notNull()
    .references(() => kolPartners.id),
  campaignId: text("campaign_id").notNull(),
  source: text("source").notNull(),
  status: text("status").notNull(),
  summary: text("summary").notNull(),
  remoteStatus: text("remote_status").notNull(),
  syncedAt: integer("synced_at").notNull(),
});
export const kolCodeJobs = sqliteTable("kol_code_jobs", {
  id: text("id").primaryKey(),
  kolId: text("kol_id")
    .notNull()
    .references(() => kolPartners.id),
  candidate: text("candidate").notNull().unique(),
  campaignId: text("campaign_id").notNull(),
  status: text("status").notNull(),
  remoteId: text("remote_id"),
  error: text("error"),
  attempts: integer("attempts").notNull().default(0),
  nextAt: integer("next_at").notNull(),
  leaseUntil: integer("lease_until").notNull().default(0),
  createdAt: integer("created_at").notNull(),
});
export const kolInbox = sqliteTable("kol_inbox", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull(),
  topic: text("topic").notNull(),
  status: text("status").notNull(),
  attempts: integer("attempts").notNull().default(0),
  nextAt: integer("next_at").notNull(),
  leaseUntil: integer("lease_until").notNull().default(0),
  error: text("error"),
  createdAt: integer("created_at").notNull(),
});
export const kolShopOrders = sqliteTable("kol_shop_orders", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  kolId: text("kol_id").references(() => kolPartners.id),
  intentId: text("intent_id"),
  currency: text("currency").notNull(),
  net: integer("net"),
  commission: integer("commission"),
  rateBps: integer("rate_bps"),
  status: text("status").notNull(),
  reason: text("reason"),
  paidAt: integer("paid_at"),
  holdUntil: integer("hold_until"),
  evidence: text("evidence").notNull(),
  checkedAt: integer("checked_at").notNull(),
});
export const kolLedger = sqliteTable("kol_ledger", {
  id: text("id").primaryKey(),
  orderId: text("order_id")
    .notNull()
    .references(() => kolShopOrders.id),
  kolId: text("kol_id")
    .notNull()
    .references(() => kolPartners.id),
  currency: text("currency").notNull(),
  amount: integer("amount").notNull(),
  availableAt: integer("available_at").notNull(),
  createdAt: integer("created_at").notNull(),
});
export const kolSettlements = sqliteTable("kol_settlements", {
  id: text("id").primaryKey(),
  kolId: text("kol_id")
    .notNull()
    .references(() => kolPartners.id),
  currency: text("currency").notNull(),
  month: text("month").notNull(),
  status: text("status").notNull(),
  total: integer("total").notNull(),
  revision: integer("revision").notNull().default(1),
  paymentRef: text("payment_ref"),
  paymentNote: text("payment_note"),
  createdAt: integer("created_at").notNull(),
  paidAt: integer("paid_at"),
});
export const kolSettlementItems = sqliteTable("kol_settlement_items", {
  snapshot: text("snapshot").notNull().default("{}"),
  ledgerId: text("ledger_id")
    .primaryKey()
    .references(() => kolLedger.id),
  settlementId: text("settlement_id")
    .notNull()
    .references(() => kolSettlements.id),
});
export const kolAudit = sqliteTable("kol_audit", {
  id: text("id").primaryKey(),
  actor: text("actor").notNull(),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  detail: text("detail").notNull(),
  createdAt: integer("created_at").notNull(),
});
export const kolRuntime = sqliteTable("kol_runtime", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

// Imported Collabs evidence is independent of Offy's historical payable ledger.
export const collabsCreators = sqliteTable("collabs_creators", {
  id: text("id").primaryKey(),
  alias: text("alias").notNull().unique(),
  name: text("name").notNull(),
  creatorKey: text("creator_key").unique(),
  officialLink: text("official_link").notNull(),
  enabled: integer("enabled", { mode: "boolean" }).notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});
/** Recoverable local cleanup; official identities and financial evidence remain reserved. */
export const collabsCreatorArchives = sqliteTable("collabs_creator_archives", {
  creatorId: text("creator_id")
    .primaryKey()
    .references(() => collabsCreators.id),
  archivedAt: integer("archived_at").notNull(),
  archivedBy: text("archived_by").notNull(),
  reason: text("reason").notNull(),
  note: text("note").notNull().default(""),
});
/** Offy request aggregates only: no visitor cookie, IP or raw user agent. */
export const collabsLinkDaily = sqliteTable(
  "collabs_link_daily",
  {
    creatorId: text("creator_id")
      .notNull()
      .references(() => collabsCreators.id),
    day: text("day").notNull(),
    opens: integer("opens").notNull(),
    firstAt: integer("first_at").notNull(),
    lastAt: integer("last_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.creatorId, t.day] })],
);
/** Anonymous aggregate landing views; separate from redirect requests and commission. */
export const collabsLandingDaily = sqliteTable(
  "collabs_landing_daily",
  {
    dtId: text("dt_id").notNull(),
    day: text("day").notNull(),
    pv: integer("pv").notNull(),
    firstAt: integer("first_at").notNull(),
    lastAt: integer("last_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.dtId, t.day] })],
);
/** Purpose-hashed browser membership only; deleted after 90 UTC days or withdrawal. */
export const collabsLandingVisitors = sqliteTable(
  "collabs_landing_visitors",
  {
    dtId: text("dt_id").notNull(),
    day: text("day").notNull(),
    visitorHash: text("visitor_hash").notNull(),
    lastAt: integer("last_at").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.dtId, t.day, t.visitorHash] }),
    index("collabs_landing_visitors_day").on(t.day),
    index("collabs_landing_visitors_hash").on(t.visitorHash),
  ],
);
/** Random per-view receipt, without a browser ID, prevents transport/effect double counting. */
export const collabsLandingReceipts = sqliteTable(
  "collabs_landing_receipts",
  {
    id: text("id").primaryKey(),
    receivedAt: integer("received_at").notNull(),
  },
  (t) => [index("collabs_landing_receipts_time").on(t.receivedAt)],
);
/** Native Flow identity is independent of aliases and CSV creator labels. */
export const collabsFlowCreators = sqliteTable("collabs_flow_creators", {
  nativeId: text("native_id").primaryKey(),
  creatorId: text("creator_id")
    .unique()
    .references(() => collabsCreators.id),
  snapshotJson: text("snapshot_json").notNull(),
  flowSentAt: integer("flow_sent_at").notNull(),
  firstReceivedAt: integer("first_received_at").notNull(),
  lastReceivedAt: integer("last_received_at").notNull(),
});
export const collabsAttributions = sqliteTable(
  "collabs_attributions",
  {
    id: text("id").primaryKey(),
    nativeId: text("native_id")
      .notNull()
      .references(() => collabsFlowCreators.nativeId),
    orderId: text("order_id").notNull(),
    orderName: text("order_name").notNull(),
    orderCreatedAt: text("order_created_at").notNull(),
    flowSentAt: integer("flow_sent_at").notNull(),
    receivedAt: integer("received_at").notNull(),
    orderJson: text("order_json"),
    checkedAt: integer("checked_at"),
    nextAt: integer("next_at").notNull(),
    leaseUntil: integer("lease_until").notNull().default(0),
    attempts: integer("attempts").notNull().default(0),
    error: text("error"),
  },
  (t) => [
    index("collabs_attributions_due_idx").on(t.nextAt, t.leaseUntil),
    index("collabs_attributions_received_idx").on(t.receivedAt),
  ],
);
export const collabsReports = sqliteTable("collabs_reports", {
  id: text("id").primaryKey(),
  digest: text("digest").notNull().unique(),
  fileSha: text("file_sha").notNull(),
  filename: text("filename").notNull(),
  kind: text("kind").notNull(),
  granularity: text("granularity").notNull(),
  salesBasis: text("sales_basis").notNull(),
  periodFrom: text("period_from").notNull(),
  periodTo: text("period_to").notNull(),
  mappingJson: text("mapping_json").notNull(),
  totalsJson: text("totals_json").notNull(),
  warningsJson: text("warnings_json").notNull(),
  originalEncrypted: text("original_encrypted").notNull(),
  rowCount: integer("row_count").notNull(),
  status: text("status").notNull(),
  supersedes: text("supersedes"),
  actor: text("actor").notNull(),
  createdAt: integer("created_at").notNull(),
});
export const collabsReportRows = sqliteTable(
  "collabs_report_rows",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    reportId: text("report_id")
      .notNull()
      .references(() => collabsReports.id),
    rowNumber: integer("row_number").notNull(),
    dataJson: text("data_json").notNull(),
  },
  (t) => [index("collabs_rows_report_idx").on(t.reportId, t.rowNumber)],
);
export const collabsChecks = sqliteTable(
  "collabs_checks",
  {
    id: text("id").primaryKey(),
    reportId: text("report_id")
      .notNull()
      .references(() => collabsReports.id),
    actor: text("actor").notNull(),
    checkedAt: integer("checked_at").notNull(),
    dataJson: text("data_json").notNull(),
  },
  (t) => [index("collabs_checks_report_idx").on(t.reportId, t.checkedAt)],
);
export const collabsReviews = sqliteTable("collabs_reviews", {
  id: text("id").primaryKey(),
  checkId: text("check_id")
    .notNull()
    .references(() => collabsChecks.id),
  findingKey: text("finding_key").notNull(),
  actor: text("actor").notNull(),
  reason: text("reason").notNull(),
  createdAt: integer("created_at").notNull(),
});
