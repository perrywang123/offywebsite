## Why

The approved OFFY in the wild design needs real product-specific photos. The NEON RUSH references used during the prototype were for testing.

## What Changes

- Resolve product buyer photos from Shopify `custom.buyer_photos`.
- Show the photo gallery when usable references are available and omit the section in other cases.
- Remove the extra label above More from this series.

## Capabilities

- Modified `commerce` for optional product buyer photos and failure isolation.

## Impact

- Product detail, Storefront API, translations, and the Shopify setup guide.
- The Shopify field remains available for future photos. Remove the three NEON RUSH test references.
- The existing product gallery, market pricing, recommendations, shopping bag and checkout remain the commerce path.
