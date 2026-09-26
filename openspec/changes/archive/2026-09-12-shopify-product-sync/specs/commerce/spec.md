## ADDED Requirements

### Requirement: Near-real-time Shopify product enrichment
The system SHALL enrich catalog products for display by fetching `title`,
`description`, `images`, and `price` from the Shopify Storefront API for any
product that has a `shopifyVariantId`, overriding the local placeholder values.
Products without a mapping, or when the Shopify fetch fails, SHALL fall back to
local catalog values. Enrichment SHALL be near-real-time via server-side
revalidation rather than a per-request live call on every render.

#### Scenario: Mapped product shows Shopify data
- **WHEN** a product has a `shopifyVariantId` and the Storefront API returns data
- **THEN** its displayed image, description, price, and title come from Shopify

#### Scenario: Unmapped product falls back to local
- **WHEN** a product has no `shopifyVariantId`
- **THEN** it renders using local catalog values and triggers no Shopify request

#### Scenario: Resilient to Shopify errors
- **WHEN** the Shopify fetch fails or returns no data for a mapped product
- **THEN** the product still renders using local catalog values (no error page)
