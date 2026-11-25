## Why

Visitors should be able to discover scheduled OFFY releases and browse their Shopify product details before sales open. Shopify already exposes the preview products and their release metadata to the Offy storefront.

## What Changes

- Add a Coming Soon option to each configured Latest card. Verify newly selected products and read the existing `custom.coming_soon` and `custom.release_date` product metafields through Shopify Storefront.
- Show the release time and a countdown on the card and the normal product route, retaining the Shopify gallery and description.
- Require the release time to have passed and Shopify to confirm variant availability in the visitor's market before offering purchase on a scheduled product.

## Capabilities

### Modified Capabilities

- `brand-site`: configure and present scheduled launches in the existing editorial grid.
- `commerce`: preview a scheduled product and enforce its release time across purchase paths.

## Impact

Home editor, product details, Storefront reads, checkout, and responsive validation. Existing homepage records need no database migration. The feature does not change any Shopify configuration or require Admin API access.
