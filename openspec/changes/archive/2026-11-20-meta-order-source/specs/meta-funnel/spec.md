## MODIFIED Requirements

### Requirement: Consistent recorded source normalization

New valid source labels SHALL replace the previous labels as a whole. Empty or invalid labels SHALL not erase the last valid labels. For `meta`, `facebook`, `instagram`, `fb` and `ig` with `paid_social` or `paid`, missing campaign, ad and ad-set IDs MAY be derived from numeric `utm_campaign`, `utm_content` and `utm_term` respectively. IDs SHALL have one to thirty digits and valid explicit IDs SHALL take precedence. Ingestion, historical read filters, source groups and evidence views SHALL use the same normalization without rewriting historical records. Saved labels SHALL be described as recorded source evidence. They SHALL NOT be represented as a verified association between a later unknown click and an ad or as final Meta attribution.

#### Scenario: New click without source labels

- **WHEN** a consented page supplies a genuine new fbclid but no valid source labels
- **THEN** the real click timestamp is captured once and last valid labels remain available as local source evidence, without asserting that those labels identify the new click.

#### Scenario: Historical UTM-only record

- **WHEN** a retained observation contains numeric Meta paid UTM values without explicit ID fields
- **THEN** ad and campaign filters and grouped counts find the same record and expose normalized IDs, and unrelated or nonnumeric UTM values do not generate an ID.

## ADDED Requirements

### Requirement: Search Shopify orders by recorded advertising source

The authenticated diagnostic workspace SHALL show each retained Shopify order matched by the signed checkout reference with its order number, recorded ad and campaign IDs when present, Meta click indicator, checkout time and Shopify payment time. Exact order-number search SHALL find matching evidence in the retained window. List filtering SHALL support either checkout or confirmed payment date in Asia/Shanghai. The workspace SHALL continue to exclude internal and Shopify test evidence by default. A click indicator alone SHALL NOT generate an ad ID. Orders with missing evidence SHALL NOT be classified as organic.

#### Scenario: Checkout and payment on different days

- **WHEN** a signed checkout and its order's confirmed payment fall on different calendar days in Asia/Shanghai
- **THEN** the order is found by either matching day and time basis, and the row shows both times.

#### Scenario: Unknown source or time

- **WHEN** an order has no usable ad ID or Shopify supplies no confirmed payment timestamp
- **THEN** the workspace shows the available click evidence and the missing field, and payment date filters do not substitute the order creation time.

#### Scenario: Existing orders and repeated scans

- **WHEN** the database upgrades or an order is re-read after a refund
- **THEN** the existing worker resumes or starts a bounded one-time rescan of retained orders, obtains payment time from successful Shopify sales and captures, and retains one evidence row per order.
