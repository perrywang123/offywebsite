# Commerce Specification

## Purpose

Describe implemented commerce as of 2026-10-31. Shopify is the only commercial source. The approved authoritative-catalog change removes local product fallback and provides explicit unavailable states.

## Requirements

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

The cart SHALL persist only local item identity and quantity in offy.cart.v1, merge duplicate adds and clamp quantities to 1–99. It SHALL preserve saved lines when verification fails, display a clear unavailable state, and restore line facts and totals only after Shopify verification. Confirmed missing or destination-ineligible identities SHALL remain until the shopper removes them; no unverified names, images or prices SHALL substitute for their facts. A cart with unresolved commercial facts SHALL NOT expose checkout or an apparently complete subtotal.

#### Scenario: Verification fails

- **WHEN** the product API is unavailable
- **THEN** saved lines remain in localStorage and the shopper sees a retry state instead of an empty bag

#### Scenario: Retry recovers

- **WHEN** verification succeeds after a failure
- **THEN** verified names, images, market prices and actionable checkout are restored

#### Scenario: Item missing in a new destination

- **WHEN** Shopify confirms no product for a saved identity in the new market
- **THEN** its identity/quantity remains removable and can recover after switching back; no complete subtotal or checkout is available until all remaining lines are verified and eligible

### Requirement: Checkout session (server-authoritative pricing)

All payment providers SHALL resolve commercial facts from Shopify before creating a checkout. Shopify failures SHALL stop checkout without charging a local or stale price. Client prices SHALL never be accepted. Existing USD restrictions for legacy Stripe/PayPal SHALL remain unless separately changed.

#### Scenario: Shopify unavailable before checkout

- **WHEN** any checkout provider cannot verify requested products and prices
- **THEN** it returns a service-unavailable result and creates no payment session

### Requirement: Shopify-hosted checkout provider

The UI SHALL explicitly select shopify. The provider SHALL resolve handles server-side to variant IDs, reject unresolved or unavailable/quote-only items with per-item reasons, and create a Storefront Cart in the visitor country and EN/ZH_CN language. It SHALL attach a return_url attribute and return checkoutUrl. Current provider does not forward the backup page's email/shipping input to Cart.

#### Scenario: Successful checkout preparation

- **WHEN** requested products resolve and Shopify Cart creation succeeds
- **THEN** the API returns a redirect to Shopify hosted checkout; Shopify owns the order and capture is unsupported

#### Scenario: Actionable refusal

- **WHEN** a product cannot be resolved or is unavailable
- **THEN** unknown_items/unavailable_items identifies the affected code, and no Cart is created for the rejected request

### Requirement: Checkout client behavior

The cart drawer and cart page SHALL share checkout preparation with duplicate-submission prevention. When commercial data cannot be verified, the client SHALL stay in the current context, preserve saved lines and offer retry without navigating to another page that depends on the same unavailable Shopify data. Item-specific 4xx refusals SHALL remain actionable.

#### Scenario: Transient preparation failure

- **WHEN** commercial verification or checkout preparation fails transiently
- **THEN** the shopper remains in context with a visible retry state and saved lines, without a misleading fallback checkout navigation

### Requirement: Purchase and gallery presentation

The own-product gallery SHALL switch between returned images and omit its thumbnail strip for a single image. Related products SHALL appear in the trailing grid, not the deleted sibling thumbnail strip. Merch SHALL have a display name without a nonexistent /collections/merch link. Sold-out cards SHALL show a pill and dim nonlinked media; their text link may still open the detail page.

#### Scenario: Mobile purchase states

- **WHEN** the PDP is in-stock, sold-out or upcoming below 768px
- **THEN** the sticky bar presents outlined Add to Bag plus primary Buy Now, two disabled controls with Sold out primary, or a reveal notice respectively

### Requirement: Legacy order capture

Stripe webhook SHALL verify its signature and persist only paid checkout completions. PayPal SHALL capture approved orders after checking USD amount against the server snapshot. Repeated provider order IDs SHALL not create duplicate orders. Current writes are not wrapped in one transaction and order numbers use a row count; these are limitations, not a concurrency guarantee.

#### Scenario: Idempotent completion

- **WHEN** the same provider order is finalized again
- **THEN** the existing order is reused rather than a second order being created

### Requirement: Order confirmation requires a high-entropy credential

Local confirmation SHALL accept Stripe session_id or PayPal order ID, never an enumerable OF-YYYY-NNNNNN credential. Local order tables SHALL NOT be described as Shopify order synchronization.

#### Scenario: Enumerable credential rejected

- **WHEN** only a sequential order number is supplied
- **THEN** the page reveals no matching order details

### Requirement: Post-purchase cart clearing

The legacy success page SHALL retain its existing bag-clearing behavior. Shopify return_url for buy-now intent SHALL carry source=buy-now and /checkout/return SHALL preserve the bag for this source. A tab-local marker set only before a valid checkout redirect SHALL also preserve a direct-purchase bag when merchant return configuration omits the query. A subsequent normal bag checkout SHALL replace that marker. Ordinary bag checkout return SHALL retain current clearing behavior. Storage failures SHALL NOT prevent checkout. Shopify return still requires merchant-side configuration beyond the Cart attribute, and this page SHALL NOT claim to verify payment.

#### Scenario: Hosted direct checkout return

- **WHEN** the Shopify return URL carries buy-now source or this tab last redirected to buy-now checkout
- **THEN** the return page preserves saved bag lines

#### Scenario: Hosted checkout return

- **WHEN** normal bag checkout returns without a buy-now marker, or the legacy success component mounts
- **THEN** it clears the bag as before

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

### Requirement: Informational shipping copy in the bag drawer

A verified nonempty bag drawer SHALL display `Worldwide shipping: $15 USD per order.` followed by `For US orders of 3+ OFFYs, shipping is $20 USD.` below its Subtotal and above Checkout. The two statements SHALL form one visual group with a decorative outline cart icon and a subtle vertical divider; the icon SHALL be hidden from assistive technology, text SHALL wrap within narrow drawers, and the existing Checkout control SHALL remain visible and operable. Both statements SHALL remain the same across visitor markets and quantities. They SHALL NOT add shipping to the subtotal, convert the quoted USD amounts to the product currency, calculate the final fee or change checkout inputs. Shopify retains final shipping authority based on destination and eligible paid items; gifts are excluded from that business quantity. Empty and unavailable bag states SHALL remain unchanged.

#### Scenario: A bag in a non-USD market

- **WHEN** a verified GBP bag is opened with one or three items
- **THEN** both approved USD informational statements are shown while Subtotal remains the verified GBP merchandise subtotal without shipping

#### Scenario: A US bag reaches the quantity threshold

- **WHEN** a verified USD bag contains three or more items
- **THEN** the same two statements are displayed, without a client-calculated shipping charge or any change to the checkout request

#### Scenario: Narrow drawer layout

- **WHEN** the nonempty bag is opened at a 320px or 375px viewport
- **THEN** the icon, divider and copy fit without horizontal overflow, text wraps naturally and the Checkout action remains within the drawer viewport

### Requirement: Complete same-series recommendations

The product detail More from this series section SHALL render every other product returned by the successful complete Shopify series query for the selected visitor market, without a six-product display cap. It SHALL exclude the current product, preserve Shopify response order and the existing responsive grid, and keep merch recommendations separate from the three doll series. Product facts SHALL remain Shopify-authoritative; the existing gallery and purchase controls SHALL remain unchanged.

#### Scenario: Series exceeds six other products

- **WHEN** Shopify returns more than six other products in the current series and market
- **THEN** all of them appear once in the recommendation grid, in response order, including those beyond the former sixth position

#### Scenario: Current product or no other products

- **WHEN** the series response includes the current product
- **THEN** it is excluded from the recommendation cards; if no other products remain, the recommendation section is omitted

#### Scenario: Recommendation read fails

- **WHEN** the corresponding Shopify series read fails
- **THEN** the page keeps the verified main product and omits unverified recommendations without a local product fallback

### Requirement: Direct product checkout

A verified available PDP SHALL offer Add to Bag and Buy Now on desktop and in the existing mobile sticky bottom bar. Buy Now SHALL request exactly one unit of the current product using the shared Shopify checkout path, without adding, merging or clearing local bag lines. Server validation SHALL reject multi-item or non-unit buy-now requests. It SHALL retain the selected-country check, server-authoritative product resolution, diagnostic observations, Collabs context and consent-gated Meta event handling. Preparing a checkout SHALL NOT imply a paid order.

#### Scenario: Buy one while a bag exists

- **WHEN** Buy Now is activated with unrelated saved bag lines
- **THEN** only the current product and quantity one are submitted; the original bag remains unchanged, including on direct-checkout return

#### Scenario: Pending or failed preparation

- **WHEN** checkout is pending
- **THEN** both PDP actions are disabled and the primary action announces Opening Shopify checkout; a failure stays on the PDP with retry and preserved bag lines

#### Scenario: Destination or availability changes

- **WHEN** the server refuses a changed destination or unavailable product
- **THEN** the PDP offers refresh/review without navigating or silently changing the product or destination
