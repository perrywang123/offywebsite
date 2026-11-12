## ADDED Requirements

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
