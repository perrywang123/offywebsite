## MODIFIED Requirements

### Requirement: Product catalog
The system SHALL expose a catalog of products with code, bilingual name, price (USD cents), series, dimensions, emotion tags, and images, served from a single static data source (`src/lib/catalog`) that acts as the local mirror of the Shopify store. The catalog SHALL contain exactly the 19 Shopify-published products, with `code` equal to the Shopify handle (e.g. `swan-princess`), Chinese names as provisional direct translations, skeleton prices equal to the Shopify current price snapshot (used by the Stripe/PayPal fallback channels), and every product carrying `shopifyHandle` + `shopifyVariantId`. Series SHALL align with the Shopify Collections: `princess-lady` (Lady系列, 12 SKUs incl. royal-grey), `outdoor-sporty` (outdoor & sporty, 1 SKU), `playful-life` (趣味生活系列, 6 SKUs incl. gurardian-angel). Placeholder WCOFFY/PCOF1 codes are removed. Displayed fields (title/images/description/price) are overridden at render time by Shopify enrichment.

#### Scenario: List products
- **WHEN** a client requests the catalog
- **THEN** exactly 19 products are returned, each with a non-negative integer price, at least one image, and a Shopify handle + variant mapping

#### Scenario: Series mirror the Shopify Collections
- **WHEN** the catalog loads
- **THEN** princess-lady has 12 products, outdoor-sporty has 1, playful-life has 6

#### Scenario: Price snapshot
- **WHEN** a product renders via a fallback payment channel (Stripe/PayPal)
- **THEN** its price equals the local snapshot of the Shopify price at migration time (enriched display price remains live from Shopify)

#### Scenario: Price tiers
- **WHEN** the catalog loads
- **THEN** prices mirror the Shopify store: 2 SKUs at $51.90, 3 at $49.90, 9 at $45.90, and 5 SKUs at $0.00

#### Scenario: Debug SKUs are Shopify-mapped
- **WHEN** a $0 SKU is present in the catalog (burger-doll, country-getaway, prep-school, gurardian-angel)
- **THEN** it has both a `shopifyHandle` and a `shopifyVariantId` so it can be checked out via the Shopify provider

### Requirement: Checkout session (server-authoritative pricing)
The system SHALL create a Stripe Checkout Session with prices taken exclusively from the server-side catalog, ignoring any client-supplied price.

#### Scenario: Missing Stripe key
- **WHEN** no Stripe secret key is configured
- **THEN** checkout returns HTTP 503 without throwing
