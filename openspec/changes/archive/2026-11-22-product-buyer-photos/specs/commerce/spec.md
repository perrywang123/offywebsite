## ADDED Requirements

### Requirement: Product buyer photos

The product detail page SHALL use the Shopify product metafield `custom.buyer_photos` as the source for its buyer photo gallery. The gallery SHALL preserve the order of usable Shopify image references. It SHALL display up to three square previews and provide access to the full set with keyboard and touch controls. The buyer photo lookup SHALL be independent of commercial facts and SHALL avoid persisting a previous photo list.

#### Scenario: Published photos exist

- **WHEN** Shopify returns one or more usable `MediaImage` references for the current product
- **THEN** OFFY in the wild displays those photos in field order and can open the selected image in the gallery

#### Scenario: Buyer photos are empty or unavailable

- **WHEN** the field is absent or empty, all references are unusable, or the photo lookup fails
- **THEN** the heading, photos and opening controls are omitted while independently verified product content and actions remain usable
