## MODIFIED Requirements

### Requirement: Cart

The system SHALL keep a client-side cart of `{ code, quantity }` lines, persisted to localStorage. On load, the cart SHALL automatically prune lines whose product code no longer exists in the catalog (removing them from storage), so badge counts and rendered lines always agree. Quantity updates SHALL be clamped to 1-99 on the client, matching the server-side clamp.

The cart drawer SHALL be at most 88% of the viewport width (capped by its existing max width), so that a tappable area of the page remains exposed to its left, and SHALL be exactly one dynamic viewport tall with safe-area padding derived from `env(safe-area-inset-bottom)`. Opening the drawer or the bag-charm quick view SHALL lock page scrolling and restore the previous value on close. Cart lines SHALL clamp long product names to two lines so prices and steppers keep a stable rhythm, and quantity steppers, remove controls and close controls SHALL expose at least 44×44px of tappable area below the 1024px breakpoint.

#### Scenario: Duplicate add
- **WHEN** the same product is added twice
- **THEN** its quantity increments rather than creating a duplicate line

#### Scenario: Stale lines are pruned on load
- **WHEN** localStorage contains a line whose code is not in the catalog
- **THEN** the line is removed from storage and never counted in badges or totals

#### Scenario: Quantity clamp
- **WHEN** the user increments quantity beyond 99
- **THEN** the value is clamped to 99 on the client, matching server behavior

#### Scenario: Drawer can be dismissed on a phone
- **WHEN** the cart drawer is open at 375px
- **THEN** the ✕ control measures at least 44×44px, clicking the exposed overlay closes
  the drawer, `documentElement` is scroll-locked while it is open, and its footer's bottom
  padding is at least `1rem + env(safe-area-inset-bottom)`

#### Scenario: Long product names do not shift the row
- **WHEN** a cart line's product name is long enough to wrap
- **THEN** the name is clamped to two lines and the stepper/remove row below it keeps its position

### Requirement: Shopify-hosted checkout provider

The system SHALL support a `shopify` payment provider that builds a cart via the
Shopify Storefront API and redirects the buyer to the Shopify-hosted
`checkoutUrl`. Cart lines SHALL be resolved server-side by mapping each catalog
product `code` to its `shopifyVariantId`; the client-supplied price is never
trusted. When an item cannot be checked out the provider SHALL return HTTP 400 with a
machine-readable reason per item — `unknown_items` when the product or its Shopify
variant cannot be resolved, `unavailable_items` when the product exists but is sold
out, unpublished or quote-only — and SHALL create no cart. The cart SHALL carry the
store's return URL as a cart attribute so the merchant can route the buyer back to
`/checkout/return` after payment. Client code MUST NOT render raw provider error codes.

#### Scenario: Create Shopify checkout
- **WHEN** a buyer checks out with `provider=shopify` and cart items that map to Shopify variants
- **THEN** the system creates a cart via the Storefront API and returns the `checkoutUrl` as a redirect

#### Scenario: Missing Shopify configuration
- **WHEN** no Shopify store domain / Storefront token is configured
- **THEN** the checkout returns HTTP 503 without throwing

#### Scenario: Item without a Shopify variant mapping
- **WHEN** a cart item has no `shopifyVariantId` in the catalog
- **THEN** the checkout returns HTTP 400 with `error: "unknown_items"` and an `items` entry naming that code, and creates no cart

#### Scenario: Sold-out item is named, not just rejected
- **WHEN** a cart contains a sold-out product
- **THEN** the checkout returns HTTP 400 with `error: "unavailable_items"` and an `items` entry `{ code, reason: "unavailable_items" }`, and the bag shows the product's name plus the instruction to remove it and retry, without printing the raw code

#### Scenario: Order confirmation is delegated to Shopify
- **WHEN** the buyer completes payment on the Shopify-hosted checkout
- **THEN** the order is owned by Shopify and the provider's `capture` is a no-op (returns not-supported), with order write-back reserved for a future webhook milestone

### Requirement: Product detail

The system SHALL render a detail page per product code with image, name, price, dimensions, and sibling-look selection. The page SHALL also expose a persistently reachable purchase action at 375×812 without requiring the visitor to scroll past the fold. The gallery SHALL present every image returned for the product, allowing the visitor to switch the main image, and sibling products of the same series SHALL remain reachable with a visible name per thumbnail. A sold-out or not-yet-released product SHALL keep the bar visible but offer no dead control.

#### Scenario: Unknown code
- **WHEN** a product code does not exist
- **THEN** the API returns 404 and the page returns not-found

#### Scenario: Buy bar is always reachable
- **WHEN** the PDP renders below the 768px breakpoint
- **THEN** a `sticky bottom-0` bar is present showing the price and an add-to-bag action,
  and its computed `position` is `sticky` (never `fixed`, which the page-enter transform
  would trap inside the document flow)

#### Scenario: Three availability states
- **WHEN** the product is in stock, sold out, or not yet released
- **THEN** the bar shows price + add to bag, price + a disabled "Sold out" control, or the
  reveal notice respectively, and no state renders a control that does nothing

#### Scenario: Gallery is the product's own images
- **WHEN** Shopify returns more than one image for the product
- **THEN** the main image can be switched between them from a horizontally scrollable
  thumbnail strip, and the strip is absent when only one image exists

#### Scenario: Sold-out products are visible in listings
- **WHEN** a product is sold out
- **THEN** its card shows a "Sold out" pill, dims the image and stops linking the media
  block, while the list itself still contains the product

## ADDED Requirements

### Requirement: Actionable checkout failures

When `/api/payments/checkout` rejects a request with a 4xx status, the client SHALL stay
on the current page rather than falling back to `/checkout`, SHALL expose the rejected
items to the calling surface, and SHALL render an actionable message naming the affected
products and telling the shopper to remove them and retry. Network errors, 5xx responses
and 200 responses without a redirect URL SHALL keep the existing fallback behaviour of
showing a visible notice and then opening `/checkout`. No raw provider error code
(`invalid_items`, `unavailable_items`, `unknown_items`, `checkout_failed`) may appear
anywhere in the rendered UI.

#### Scenario: Sold-out item blocks checkout in place
- **WHEN** the bag contains a sold-out product and the shopper presses Checkout
- **THEN** no navigation happens, the drawer shows the product's name with a
  remove-and-retry instruction, and the Checkout button is enabled again for a retry

#### Scenario: Transient failure still falls back
- **WHEN** the checkout request fails with a network error or a 5xx status
- **THEN** a visible notice appears and the client navigates to `/checkout`

#### Scenario: Retry succeeds after the offending item is gone
- **WHEN** the shopper retries after the blocked state
- **THEN** the blocked message is cleared and a successful response redirects to the
  Shopify checkout URL

### Requirement: Post-purchase cart clearing

The site SHALL serve `/checkout/return` as the post-purchase landing page, which SHALL
empty the bag on mount and confirm the outcome to the shopper, so that a completed
purchase cannot leave previously bought products in the bag.

#### Scenario: Returning from the hosted checkout empties the bag
- **WHEN** `/checkout/return` mounts
- **THEN** the cart lines are cleared and the bag badge no longer shows the purchased quantity

#### Scenario: The landing page is reachable and honest
- **WHEN** the page renders
- **THEN** it shows a thank-you heading, a note that a Shopify confirmation email
  follows a completed order, and a link back to the catalog
