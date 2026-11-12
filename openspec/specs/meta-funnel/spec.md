# meta-funnel Specification

## Purpose

Define optional consent-aware Meta storefront events, bounded server delivery and authenticated diagnostics while preserving Shopify checkout and its ownership of Purchase reporting.

## Requirements

### Requirement: Consented storefront funnel

The storefront SHALL optionally send PageView, ViewContent and AddToCart to one configured Meta Pixel, independently of Collabs. Shopify's existing official integration SHALL exclusively own Meta InitiateCheckout and Purchase. Offy SHALL record CheckoutReady only as local evidence. It SHALL honor Shopify analytics, marketing and data sharing permissions and GPC, fail closed while consent is unknown, avoid replaying pre-consent actions, and stop after withdrawal.

#### Scenario: Checkout preparation

- **WHEN** a consented cart or Buy Now checkout receives a valid Shopify redirect
- **THEN** Offy records local CheckoutReady with its signed diagnostic association, emits no Meta InitiateCheckout or Purchase, and preserves the redirect even if tracking fails.

#### Scenario: Consent denied

- **WHEN** marketing consent is absent or revoked
- **THEN** no Meta script, event, marketing cookie or CAPI payload is created for that action.

#### Scenario: Verified commercial values

- **WHEN** an event describes products
- **THEN** it uses current Shopify-derived values and currency; missing prices or mixed currencies omit monetary data, and no unverified catalog ID mapping is invented.

#### Scenario: New source and expired context

- **WHEN** consented navigation supplies a new valid ad source or the saved context expires
- **THEN** source fields are replaced as one context rather than merged across campaigns, unresolved macros are ignored, real click timestamps are not renewed by navigation, click matching older than 30 days is omitted, and no click ID is fabricated.

### Requirement: Durable critical event delivery

The service SHALL queue only AddToCart for CAPI, use the browser event ID/name for deduplication, encrypt matching identifiers at rest, enforce same-origin bounded ingestion, and keep tokens server-only. A bounded leased worker SHALL use finite retries and never execute commerce operations. Legacy queued checkout events SHALL be retained as suppressed evidence and never sent by the new worker.

#### Scenario: Old client or queued checkout event

- **WHEN** an old client posts InitiateCheckout or an old checkout job remains queued
- **THEN** no new CAPI checkout request is sent and the local record remains distinguishable from accepted Meta delivery.

#### Scenario: Retry and duplicate delivery

- **WHEN** ingestion repeats or delivery encounters a transient failure
- **THEN** only one outbox job exists per event ID, and retries retain the original ID and timestamp.

### Requirement: Diagnosis without invented attribution

Authenticated administrators behind existing ingress SHALL see redacted local observations, source IDs, delivery and checkout/order associations, filterable by an explicit Asia/Shanghai date window and source. Known internal tests SHALL be excluded by default and optionally inspectable. Counts SHALL not imply independent people or Meta attribution; currency totals SHALL remain separate. Accepted CAPI requests SHALL not be labeled ad-attributed purchases. Offy SHALL never emit Purchase on return pages or its worker.

#### Scenario: Scoped evidence

- **WHEN** an administrator filters an observation cohort or opens a journey
- **THEN** summary and rows use the same scope, same-browser evidence and matched order facts are distinguishable, and raw visitor IDs, click/browser cookies and secrets are not exposed.

#### Scenario: Checkout succeeds while tracking fails

- **WHEN** observation storage, signing, order reading or external transport fails
- **THEN** checkout retains its existing items, market, price, discounts and redirect; diagnostic failure does not block payment.

### Requirement: Signed read-only order evidence

With marketing permission the checkout MAY attach only an optional signed random diagnostic reference to Shopify cart attributes. A bounded incremental Admin API reader SHALL persist minimal order facts only when the signature and an existing consented checkout observation match. It SHALL upsert by order ID, distinguish paid/refunded/canceled/test facts, exclude tests by default, and store no buyer contacts, addresses or payment credentials. Shopify access failures SHALL not stop CAPI or the storefront. Retention SHALL be at most 30 days; withdrawal SHALL erase linked marketing order evidence and prevent its automatic re-import.

#### Scenario: Matching order and repeat scan

- **WHEN** Shopify returns an order with a valid reference linked to retained local evidence
- **THEN** the administrator can trace source → local checkout → Shopify order facts, repeated scans update that order once, and the result is labeled local reconciliation rather than Meta ad attribution.

#### Scenario: Invalid, missing or historical reference

- **WHEN** an order lacks a valid retained reference or marketing permission was withdrawn
- **THEN** no guessed marketing association or fabricated zero-revenue conclusion is produced.

### Requirement: Operator ad source setup

The admin SHALL provide a copyable Meta URL-parameter template for campaign, ad set and ad IDs and a concise operating checklist. It SHALL not publish advertisements, fabricate fbclid, or describe a manual parameter test as real paid-ad attribution.

#### Scenario: Attribution acceptance

- **WHEN** isolated or unpaid browser validation completes
- **THEN** it proves only those exercised stages; final paid-ad purchase attribution requires separately observed Meta Ads Manager evidence.

### Requirement: Read-only visual diagnostics

The authenticated admin SHALL expose daily event/browser trends, independent stage totals, same-browser sequential funnel, ad-source groups and AddToCart-only delivery health from all retained records matching global date/source/ad/test filters. Event/status/stage detail filters SHALL not alter the analytics scope. Graphs SHALL have accessible numeric equivalents, responsive layouts and explicit units, Shanghai time and retained-data limitations.

#### Scenario: Daily and period distinct counts

- **WHEN** a browser visits repeatedly on multiple days and there are more than 30 observations
- **THEN** daily event counts and daily browser distincts include all matching records, period distincts count that browser once, and pagination does not change charts.

#### Scenario: Sequential progression and Buy Now

- **WHEN** matching observations contain PageView, later ViewContent and later signed CheckoutReady, optionally followed by an in-window matched paid order
- **THEN** each browser counts once in each reached sequential stage, AddToCart is optional, and absent/out-of-order precursors or out-of-window orders are not fabricated into the funnel.

#### Scenario: Source changes and local evidence

- **WHEN** an operator filters an ad or views ad groups
- **THEN** grouping uses recorded source IDs with per-group distincts, unlabelled traffic is not called organic, and neither those groups nor matched payment facts are labelled Meta final attribution.

#### Scenario: Unknown evidence and delivery health

- **WHEN** Shopify order sync is unconfigured, unsuccessful or stale, or no CAPI jobs exist
- **THEN** unavailable payment or acceptance ratios show unknown rather than zero or 100%, and only AddToCart jobs contribute to delivery health while refunds/currencies remain explicit.

#### Scenario: Stage evidence drill-down

- **WHEN** an administrator opens a stage and then an observed browser journey
- **THEN** detail pagination is limited to that cohort, server-only visitor identifiers are not exposed, and existing event/checkout/order evidence remains available without writes or new external commerce calls.
