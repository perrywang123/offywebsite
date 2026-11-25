## ADDED Requirements

### Requirement: Scheduled product preview and purchase gate

The normal product route SHALL render the Shopify gallery and description of a storefront-readable product in preview. A product whose `custom.coming_soon` boolean is true SHALL use its `custom.release_date` date-time field to determine its launch. Preview data SHALL omit purchase controls, commercial offers, and price tracking. The product's live release gate SHALL apply independently of the homepage card configuration. A fresh, market-specific variant availability read SHALL be required for purchases after the planned time.

#### Scenario: Before the scheduled time or time unannounced

- **WHEN** a Shopify product is marked Coming Soon and its launch time is in the future or unannounced
- **THEN** the product details shows Coming Soon and the release time and countdown when known
- **AND** the server withholds purchase eligibility and refuses checkout even if Shopify reports the variant available before the agreed time
- **AND** a product outside the configured series SHALL omit same-series recommendations in the preview

#### Scenario: Countdown expires

- **WHEN** the shopper reaches the scheduled time
- **THEN** the page rechecks Shopify without navigating away
- **AND** a product still marked Coming Soon without verified availability keeps checkout locked and exposes a retry, while products with verified availability use the regular purchase flow

#### Scenario: Shopify withdraws a preview

- **WHEN** Shopify disables Coming Soon or stops exposing the product to the Storefront API
- **THEN** the normal product availability, missing-product, or unavailable behavior applies to the corresponding verified response
