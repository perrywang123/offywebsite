## ADDED Requirements

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

## MODIFIED Requirements

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
