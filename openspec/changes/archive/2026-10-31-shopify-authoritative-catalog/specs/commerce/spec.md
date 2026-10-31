## MODIFIED Requirements

### Requirement: Product catalog

Commercial product facts SHALL come exclusively from successful Shopify responses in the selected market. The existing three-series route mapping and merch ordering SHALL remain site configuration. Local product snapshots, local translated names and local commercial overrides SHALL NOT substitute for missing or failed Shopify data. A failed fetch SHALL NOT be represented as a successful empty catalog, a zero price or a sold-out product. Cache revalidation failures SHALL NOT expose stale product facts as current ones.

#### Scenario: Catalog reflects the current Shopify market

- **WHEN** the catalog renders successfully
- **THEN** its members and commercial fields come from Shopify in that market, without a hardcoded product count, using the same first-variant price and availability as detail and checkout

#### Scenario: Shopify cannot be reached

- **WHEN** transport, authentication, GraphQL validation or required-field validation fails
- **THEN** the affected commercial surface shows an unavailable state without local products or prices

### Requirement: Product detail

Product detail SHALL distinguish verified absence from upstream failure and SHALL show only Shopify-confirmed product facts. Configured handle redirects, own-product gallery, related-product and responsive purchase interactions SHALL remain available when their corresponding data loads successfully.

#### Scenario: Confirmed unknown handle

- **WHEN** Shopify responds successfully and explicitly returns no product
- **THEN** the API and detail page return not-found

#### Scenario: Detail request fails

- **WHEN** Shopify cannot resolve the request reliably
- **THEN** the page offers retry and navigation without an unverified name, image, price or purchase control, and does not report a false 404

### Requirement: Cart

The cart SHALL persist only local item identity and quantity in offy.cart.v1, merge duplicate adds and clamp quantities to 1–99. It SHALL preserve saved lines when verification fails, display a clear unavailable state, and restore line facts and totals only after Shopify verification. Only confirmed missing items may be pruned automatically. A cart with unresolved commercial facts SHALL NOT expose checkout or an apparently complete subtotal.

#### Scenario: Verification fails

- **WHEN** the product API is unavailable
- **THEN** saved lines remain in localStorage and the shopper sees a retry state instead of an empty bag

#### Scenario: Retry recovers

- **WHEN** verification succeeds after a failure
- **THEN** verified names, images, market prices and actionable checkout are restored

### Requirement: Checkout session (server-authoritative pricing)

All payment providers SHALL resolve commercial facts from Shopify before creating a checkout. Shopify failures SHALL stop checkout without charging a local or stale price. Client prices SHALL never be accepted. Existing USD restrictions for legacy Stripe/PayPal SHALL remain unless separately changed.

#### Scenario: Shopify unavailable before checkout

- **WHEN** any checkout provider cannot verify requested products and prices
- **THEN** it returns a service-unavailable result and creates no payment session

### Requirement: Checkout client behavior

The cart drawer and cart page SHALL share checkout preparation with duplicate-submission prevention. When commercial data cannot be verified, the client SHALL stay in the current context, preserve saved lines and offer retry without navigating to another page that depends on the same unavailable Shopify data. Item-specific 4xx refusals SHALL remain actionable.

#### Scenario: Transient preparation failure

- **WHEN** commercial verification or checkout preparation fails transiently
- **THEN** the shopper remains in context with a visible retry state and saved lines, without a misleading fallback checkout navigation

## ADDED Requirements

### Requirement: Commercial data unavailable states

The product APIs SHALL distinguish successful empty results, confirmed absence and upstream failure. Upstream failure SHALL return HTTP 503 with no commercial fallback and no-store caching. Storefront unavailable states SHALL support bounded, visible retry and remain keyboard-accessible without exposing internal provider errors.

#### Scenario: Empty is not an outage

- **WHEN** Shopify successfully returns an empty collection
- **THEN** the storefront renders a genuine empty state, not the outage presentation

#### Scenario: Unavailable is not zero

- **WHEN** a required price or currency cannot be verified
- **THEN** no amount or subtotal is displayed as a substitute

#### Scenario: Paginated catalog cannot be completed

- **WHEN** a later page fails or pagination proof is missing or cyclic
- **THEN** the read is unavailable rather than a successful partial catalog
