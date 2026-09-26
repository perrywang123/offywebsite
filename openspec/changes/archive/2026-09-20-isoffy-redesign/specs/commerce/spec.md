## MODIFIED Requirements

### Requirement: Product catalog
The system SHALL expose a catalog of products with code, bilingual name, price (USD cents), series, dimensions, emotion tags, and images, served from a single static data source (`src/lib/catalog`). The catalog SHALL define 3 series — princess-lady (公主lady系列, 12 SKUs, $22), fashion-life (时尚潮流生活, 12 SKUs, $22), playful-life (趣味生活系列, 13 SKUs, $32) — using `WCOFFY-CPL01..12` / `WCOFFY-FLS01..12` / `WCOFFY-PLS01..13` codes. The existing Shopify-mapped product (PCOF1-A4 / offy_redrush) is retained as an additional SKU in fashion-life to keep the live payment path. Product names are provisional ("系列名 + 编号") until official names arrive; prices are provisional per-series tiers until each SKU is mapped to Shopify.

#### Scenario: List products
- **WHEN** a client requests the catalog
- **THEN** every sellable product is returned with a positive integer price and at least one image, across 3 series and 38 products (37 WCOFFY + 1 retained PCOF1-A4)

#### Scenario: Price tiers
- **WHEN** a princess-lady or fashion-life product renders
- **THEN** its price is $22.00; playful-life products are $32.00

### Requirement: Shopify-driven product list
The product list page SHALL be driven by the local catalog (all 38 SKUs), with
per-product Shopify enrichment applied when a `shopifyHandle` is mapped. The
previous behavior (list membership sourced from Shopify) is reverted until more
SKUs are published to Shopify; the Shopify fetch fallback requirement is thereby
retired in favor of local-first rendering.

#### Scenario: Published product appears
- **WHEN** a product exists in the local catalog and the list page renders
- **THEN** it appears in the list, enriched with Shopify title/image/USD price when a `shopifyHandle` mapping exists

#### Scenario: Unpublished product disappears
- **WHEN** a product is removed from the local catalog (or marked unavailable)
- **THEN** it no longer appears in the list

#### Scenario: Resilient fallback
- **WHEN** the Shopify enrichment fetch fails for a mapped product
- **THEN** the list page still renders all local products using local catalog values
