## MODIFIED Requirements

### Requirement: Scheduled product preview and purchase gate

The normal product route SHALL render the Shopify gallery and description of a storefront-readable product in preview. A product whose `custom.coming_soon` boolean is true SHALL use its `custom.release_date` date-time field to determine its launch. The product detail SHALL present Coming Soon, the known release date and the countdown in a compact row below the name, using America/New_York for the displayed date and the same Shopify instant for the countdown. The preview SHALL suppress recognized duplicate release copy when the structured time is known and keep other Shopify description content intact. Preview data SHALL omit purchase controls, commercial offers, and price tracking. The product's live release gate SHALL apply independently of the homepage card configuration. A fresh, market-specific variant availability read SHALL be required for purchases after the planned time.

#### Scenario: Before the scheduled time or time unannounced

- **WHEN** a Shopify product is marked Coming Soon and its launch time is in the future or unannounced
- **THEN** the product detail shows Coming Soon and the release time and countdown when known, or a date-to-be-announced notice when unknown
- **AND** the gallery stays beside the product information on desktop and above it on mobile
- **AND** the server withholds purchase eligibility and refuses checkout even if Shopify reports the variant available before the agreed time
- **AND** a product outside the configured series SHALL omit same-series recommendations in the preview

#### Scenario: The Shopify date and visible Eastern offset

- **WHEN** Shopify supplies a valid release instant in UTC or with an explicit offset
- **THEN** the detail page displays the same instant in EST or EDT as appropriate, without modifying that instant
- **AND** homepage cards retain their existing display behavior

#### Scenario: Countdown expires

- **WHEN** the shopper reaches the scheduled time
- **THEN** the page rechecks Shopify without navigating away
- **AND** a product still marked Coming Soon without verified availability keeps checkout locked and exposes a retry, while products with verified availability use the regular purchase flow

#### Scenario: Shopify withdraws a preview

- **WHEN** Shopify disables Coming Soon or stops exposing the product to the Storefront API
- **THEN** the normal product availability, missing-product, or unavailable behavior applies to the corresponding verified response
