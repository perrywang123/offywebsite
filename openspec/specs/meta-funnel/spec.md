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

The authenticated admin SHALL expose daily event/browser trends, independent stage totals, same-browser sequential funnel, ad-source groups and AddToCart-only delivery health from all retained records matching global date/source/ad/test filters. Event/status/stage detail filters SHALL not alter the analytics scope. Graphs SHALL have accessible numeric equivalents, responsive layouts and explicit units, Shanghai time and retained-data limitations. A ViewContent at most two seconds before the first PageView MAY count only when both observations have the same page path, to tolerate page initialization ordering; genuinely missing or out-of-order prerequisites SHALL remain excluded.

#### Scenario: Daily and period distinct counts

- **WHEN** a browser visits repeatedly on multiple days and there are more than 30 observations
- **THEN** daily event counts and daily browser distincts include all matching records, period distincts count that browser once, and pagination does not change charts.

#### Scenario: Sequential progression and Buy Now

- **WHEN** matching observations contain PageView, later ViewContent and later signed CheckoutReady, optionally followed by an in-window matched paid order
- **THEN** each browser counts once in each reached sequential stage, AddToCart is optional, and absent/out-of-order precursors or out-of-window orders are not fabricated into the funnel.

#### Scenario: Same-page initialization inversion

- **WHEN** a product view precedes the first page view by at most two seconds on the same path
- **THEN** the recorded product view and its later matched checkout/order may progress through the funnel; an inversion across different paths or beyond two seconds does not qualify.

#### Scenario: Source changes and local evidence

- **WHEN** an operator filters an ad or views ad groups
- **THEN** grouping uses recorded source IDs with per-group distincts, unlabelled traffic is not called organic, and neither those groups nor matched payment facts are labelled Meta final attribution.

#### Scenario: Unknown evidence and delivery health

- **WHEN** Shopify order sync is unconfigured, unsuccessful or stale, or no CAPI jobs exist
- **THEN** unavailable payment or acceptance ratios show unknown rather than zero or 100%, and only AddToCart jobs contribute to delivery health while refunds/currencies remain explicit.

#### Scenario: Stage evidence drill-down

- **WHEN** an administrator opens a stage and then an observed browser journey
- **THEN** detail pagination is limited to that cohort, server-only visitor identifiers are not exposed, and existing event/checkout/order evidence remains available without writes or new external commerce calls.

### Requirement: Bounded browser observation retry

Consented browser observations SHALL use at most 50 in-memory jobs with concurrency at most two, three attempts per job and a 60-second lifetime. Network failures, timeouts, 429 and 5xx MAY retry with the same event ID, occurrence time and body; other 4xx SHALL terminate. Pixel emission SHALL occur only once per observed action. Withdrawal, disabled tracking, expired context or changed browser identity SHALL cancel pending work. No retry SHALL block shopping or replay pre-consent actions.

#### Scenario: Lost ingestion response

- **WHEN** the browser retries after an unknown server acceptance result
- **THEN** the original event ID is reused, the server keeps one observation/outbox job, and no additional Pixel action is emitted.

#### Scenario: Revoked permission or changed identity

- **WHEN** permission is withdrawn or a queued observation no longer belongs to the active browser context
- **THEN** queued retries are canceled and in-flight transport is aborted where possible without creating a replacement identity.

### Requirement: Internal observations remain local

Sources tagged `utm_source=offy_validation` or `utm_medium=internal_test`, case-insensitively, SHALL remain inspectable local observations but SHALL not load or emit Meta Pixel events, create CAPI matching payloads or be delivered by the worker. Existing unsent internal jobs SHALL become suppressed with payloads removed. Historical accepted deliveries SHALL not be rewritten as unsent.

#### Scenario: First load and internal navigation

- **WHEN** a permitted browser enters a tagged internal visit and navigates to an untagged product page
- **THEN** the retained internal source suppresses Pixel and CAPI while local event and checkout evidence remain available under the existing test filter.

#### Scenario: Older browser or worker queue

- **WHEN** an older browser posts an internally tagged AddToCart or an internal pending/sending job exists
- **THEN** the server suppresses external delivery independently of the browser version and removes its matching payload.

### Requirement: Consistent recorded source normalization

New valid source labels SHALL replace the previous labels as a whole. Empty or invalid labels SHALL not erase the last valid labels. In the controlled `meta / paid_social` UTM template, missing campaign/ad/ad-set IDs MAY be derived from bounded numeric utm_campaign/content/term respectively; explicit IDs SHALL take precedence. Ingestion, historical read filters, source groups and evidence views SHALL use the same normalization without rewriting historical records. Saved labels SHALL be described as recorded source evidence, never as a verified association between a later unknown click and an ad or as Meta final attribution.

#### Scenario: New click without source labels

- **WHEN** a consented page supplies a genuine new fbclid but no valid source labels
- **THEN** the real click timestamp is captured once and last valid labels remain available as local source evidence, without asserting that those labels identify the new click.

#### Scenario: Historical UTM-only record

- **WHEN** a retained observation contains numeric Meta paid-social UTM values without explicit ID fields
- **THEN** ad/campaign filters and grouped counts can find the same record and expose normalized IDs without inventing identity for unrelated or nonnumeric UTM values.
