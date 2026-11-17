## ADDED Requirements

### Requirement: Approved brand search icon
The storefront SHALL serve a square 96 by 96 PNG favicon using the owner-supplied monochrome OFFY artwork with its aspect ratio preserved, without changing the Header logo.

#### Scenario: Search crawler requests favicon
- **WHEN** the advertised icon URL is requested
- **THEN** a valid 96 by 96 PNG containing the approved artwork is returned without authentication.

### Requirement: Page-specific search metadata
Public marketing and catalog pages SHALL declare approved, page-specific titles, descriptions, self canonical URLs and matching Open Graph metadata. Hreflang SHALL reference only actually routed languages at the same page path.

#### Scenario: English catalog page
- **WHEN** /products is rendered
- **THEN** it describes purchasable OFFY plush bag charms and its canonical, Open Graph URL and English alternate refer to /products rather than the homepage.

#### Scenario: Upstream catalog is unavailable
- **WHEN** Shopify facts cannot be obtained
- **THEN** the existing noindex/retry behavior remains and no unverified Product/Offer is published.

### Requirement: Shopify SEO is authoritative for products
Product and collection reads SHALL request Shopify SEO title and description. Metadata SHALL prefer nonblank Shopify SEO values independently for each field. Missing or blank fields SHALL use the current Shopify product content or approved series editorial copy. SEO values SHALL NOT change visible product facts, SKU, market price, availability or checkout variant.

#### Scenario: SEO is partially populated
- **WHEN** Shopify returns an SEO title and a blank description
- **THEN** the title is used without a repeated brand suffix and the description uses current live product content.

#### Scenario: No SEO values
- **WHEN** Shopify SEO values are null, missing or whitespace
- **THEN** metadata remains valid and commercial data remains unchanged.

### Requirement: Search intent and entity evidence
The purchasable bag charm entry SHALL use the existing live /products listing. The /bag-charm teaser SHALL remain explicitly upcoming. Product structured data SHALL use the same live price/currency/availability as the visible page and link stable brand, seller and website entities without fabricated reviews, identifiers or policy facts.

#### Scenario: Visitor shops in a non-US market
- **WHEN** a product page shows a Shopify GBP or HKD price
- **THEN** its structured Offer uses that same amount and currency, not a forced USD amount.

#### Scenario: Prospective collection
- **WHEN** /bag-charm is crawled
- **THEN** the title and description identify an upcoming collection and do not claim the teaser items can be purchased.
