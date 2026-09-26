# Commerce Specification

## Purpose
Sell Offy products (one SKU per look) with a Casetify-style "pick a look → add to bag → checkout" flow and Stripe payment (test mode, USD). Full inventory / admin / CMS remain future milestones.

## Requirements

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

### Requirement: Product detail
The system SHALL render a detail page per product code with image, name, price, dimensions, and sibling-look selection.

#### Scenario: Unknown code
- **WHEN** a product code does not exist
- **THEN** the API returns 404 and the page returns not-found

### Requirement: Cart
The system SHALL keep a client-side cart of `{ code, quantity }` lines, persisted to localStorage. On load, the cart SHALL automatically prune lines whose product code no longer exists in the catalog (removing them from storage), so badge counts and rendered lines always agree. Quantity updates SHALL be clamped to 1-99 on the client, matching the server-side clamp.

#### Scenario: Duplicate add
- **WHEN** the same product is added twice
- **THEN** its quantity increments rather than creating a duplicate line

#### Scenario: Stale lines are pruned on load
- **WHEN** localStorage contains a line whose code is not in the catalog
- **THEN** the line is removed from storage and never counted in badges or totals

#### Scenario: Quantity clamp
- **WHEN** the user increments quantity beyond 99
- **THEN** the value is clamped to 99 on the client, matching server behavior

### Requirement: Checkout session (server-authoritative pricing)
The system SHALL create a Stripe Checkout Session with prices taken exclusively from the server-side catalog, ignoring any client-supplied price.

#### Scenario: Missing Stripe key
- **WHEN** no Stripe secret key is configured
- **THEN** checkout returns HTTP 503 without throwing

### Requirement: Order capture via webhook
The system SHALL persist an order only after a verified `checkout.session.completed` webhook, idempotently.

#### Scenario: Repeated webhook event
- **WHEN** the same event is delivered twice
- **THEN** only one order is written

### Requirement: Payment abstraction (reserved)
The system SHALL keep the payment boundary behind a provider abstraction so additional providers can be added without changing the checkout UI. The checkout UI and the checkout API SHALL agree on provider identifiers: the UI submits `stripe` (not `card`) for card payments, and the API validates the same enum.

#### Scenario: Add a provider
- **WHEN** a new payment provider is registered
- **THEN** the checkout flow can use it without changes to the UI contract

#### Scenario: Card payment routes to Stripe
- **WHEN** the buyer selects card payment and submits
- **THEN** the API accepts the request and routes it to the Stripe provider (no 400)

### Requirement: Inventory & order management (reserved)
The system SHALL support stock levels and a merchant order dashboard in a future milestone. (Reserved — not yet implemented.)

#### Scenario: Reserved milestone
- **WHEN** inventory and order management are implemented in a future milestone
- **THEN** stock levels and a merchant dashboard become available

### Requirement: Shopify-hosted checkout provider
The system SHALL support a `shopify` payment provider that builds a cart via the
Shopify Storefront API and redirects the buyer to the Shopify-hosted
`checkoutUrl`. Cart lines SHALL be resolved server-side by mapping each catalog
product `code` to its `shopifyVariantId`; the client-supplied price is never
trusted.

#### Scenario: Create Shopify checkout
- **WHEN** a buyer checks out with `provider=shopify` and cart items that map to Shopify variants
- **THEN** the system creates a cart via the Storefront API and returns the `checkoutUrl` as a redirect

#### Scenario: Missing Shopify configuration
- **WHEN** no Shopify store domain / Storefront token is configured
- **THEN** the checkout returns HTTP 503 without throwing

#### Scenario: Item without a Shopify variant mapping
- **WHEN** a cart item has no `shopifyVariantId` in the catalog
- **THEN** the checkout returns HTTP 400 and creates no cart

#### Scenario: Order confirmation is delegated to Shopify
- **WHEN** the buyer completes payment on the Shopify-hosted checkout
- **THEN** the order is owned by Shopify and the provider's `capture` is a no-op (returns not-supported), with order write-back reserved for a future webhook milestone

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

### Requirement: Order confirmation requires a high-entropy credential
The checkout success page SHALL look up orders only by a high-entropy credential —
the Stripe `session_id` or the PayPal order id — never by the enumerable order
number (`OF-YYYY-NNNNNN`). Requests carrying only an order number SHALL NOT
return order details.

#### Scenario: Stripe success via session_id
- **WHEN** the buyer returns from Stripe with `?session_id=...`
- **THEN** the page resolves the order through the session record and displays it

#### Scenario: Enumerable order number rejected
- **WHEN** a request carries only `?order_id=OF-2026-000001`
- **THEN** the page does not render any customer PII or order details

### Requirement: Product detail shows Shopify description
The product detail page SHALL render the product description (enriched from
Shopify) under a 「关于这款形象」 heading, hidden when the description is empty.

#### Scenario: Description renders
- **WHEN** a product has a non-empty description
- **THEN** it appears on the detail page in the current locale (zh falls back to en text until Shopify translations exist)
