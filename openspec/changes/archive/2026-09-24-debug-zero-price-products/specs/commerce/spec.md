## MODIFIED Requirements

### Requirement: Product catalog
The system SHALL expose a catalog of products with code, bilingual name, price (USD cents), series, dimensions, emotion tags, and images, served from a single static data source (`src/lib/catalog`). The catalog SHALL define 3 series — princess-lady (公主lady系列, 12 SKUs, $22), fashion-life (时尚潮流生活, 12 SKUs, $22), playful-life (趣味生活系列, 13 SKUs, $32) — using `WCOFFY-CPL01..12` / `WCOFFY-FLS01..12` / `WCOFFY-PLS01..13` codes. The existing Shopify-mapped product (PCOF1-A4 / offy_redrush) is retained as an additional SKU in fashion-life to keep the live payment path. In addition, 4 debug SKUs mapped to real Shopify products (BURGER-DOLL / COUNTRY-GETAWAY / PREP-SCHOOL / GURARDIAN-ANGEL, all USD $0) SHALL be present in fashion-life for end-to-end payment debugging; a $0 price is allowed only for SKUs mapped to a real Shopify product. Product names are provisional ("系列名 + 编号") until official names arrive; prices are provisional per-series tiers until each SKU is mapped to Shopify.

#### Scenario: List products
- **WHEN** a client requests the catalog
- **THEN** every product is returned with a non-negative integer price and at least one image, across 42 products (37 WCOFFY + PCOF1-A4 + 4 debug SKUs)

#### Scenario: Price tiers
- **WHEN** a princess-lady or fashion-life product renders
- **THEN** its price is $22.00; playful-life products are $32.00; the 4 debug SKUs are $0.00

#### Scenario: Debug SKUs are Shopify-mapped
- **WHEN** a $0 SKU is present in the catalog
- **THEN** it has both a `shopifyHandle` and a `shopifyVariantId` so it can be checked out via the Shopify provider

### Requirement: Near-real-time Shopify product enrichment
The system SHALL enrich catalog products for display by fetching `title`,
`description`, `images`, and `price` from the Shopify Storefront API for any
product that has a `shopifyVariantId`, overriding the local placeholder values.
Products without a mapping, or when the Shopify fetch fails, SHALL fall back to
local catalog values. Enrichment SHALL be near-real-time via server-side
revalidation rather than a per-request live call on every render. The price
override applies whenever Shopify reports a USD price (including a legitimate
$0), and never for non-USD currencies.

#### Scenario: Mapped product shows Shopify data
- **WHEN** a product has a `shopifyVariantId` and the Storefront API returns data
- **THEN** its displayed image, description, price, and title come from Shopify

#### Scenario: USD $0 price overrides
- **WHEN** Shopify returns a USD price of $0 for a mapped product
- **THEN** the displayed price is $0.00 (a legitimate free product), not the local placeholder

#### Scenario: Unmapped product falls back to local
- **WHEN** a product has no `shopifyVariantId`
- **THEN** it renders using local catalog values and triggers no Shopify request

#### Scenario: Resilient to Shopify errors
- **WHEN** the Shopify fetch fails or returns no data for a mapped product
- **THEN** the product still renders using local catalog values (no error page)
