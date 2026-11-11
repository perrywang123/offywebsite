## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: Post-purchase cart clearing

The legacy success page SHALL retain its existing bag-clearing behavior. Shopify return_url for buy-now intent SHALL carry source=buy-now and /checkout/return SHALL preserve the bag for this source. A tab-local marker set only before a valid checkout redirect SHALL also preserve a direct-purchase bag when merchant return configuration omits the query. A subsequent normal bag checkout SHALL replace that marker. Ordinary bag checkout return SHALL retain current clearing behavior. Storage failures SHALL NOT prevent checkout. Shopify return still requires merchant-side configuration beyond the Cart attribute, and this page SHALL NOT claim to verify payment.

#### Scenario: Hosted direct checkout return

- **WHEN** the Shopify return URL carries buy-now source or this tab last redirected to buy-now checkout
- **THEN** the return page preserves saved bag lines

#### Scenario: Hosted checkout return

- **WHEN** normal bag checkout returns without a buy-now marker, or the legacy success component mounts
- **THEN** it clears the bag as before

### Requirement: Purchase and gallery presentation

The own-product gallery SHALL switch between returned images and omit its thumbnail strip for a single image. Related products SHALL appear in the trailing grid, not the deleted sibling thumbnail strip. Merch SHALL have a display name without a nonexistent /collections/merch link. Sold-out cards SHALL show a pill and dim nonlinked media; their text link may still open the detail page.

#### Scenario: Mobile purchase states

- **WHEN** the PDP is in-stock, sold-out or upcoming below 768px
- **THEN** the sticky bar presents outlined Add to Bag plus primary Buy Now, two disabled controls with Sold out primary, or a reveal notice respectively
