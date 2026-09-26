## ADDED Requirements

### Requirement: Shopify-driven product list
The product list page SHALL source its members from Shopify (Storefront
`products` in the configured market), so that products published/active in
Shopify appear and unpublished/unavailable ones disappear, without code changes.
Display fields (title/image/price) come from Shopify in the market currency
(US → USD). If the Shopify fetch fails, the page SHALL fall back to the local
catalog so it never renders empty.

#### Scenario: Published product appears
- **WHEN** a product is published (active) to the Headless channel and the list page renders
- **THEN** it appears in the list with its Shopify title, image, and USD price

#### Scenario: Unpublished product disappears
- **WHEN** a product is unpublished or set unavailable in Shopify
- **THEN** it no longer appears in the list (Storefront returns only published products)

#### Scenario: Resilient fallback
- **WHEN** the Shopify products fetch fails
- **THEN** the list page falls back to the local catalog and still renders
