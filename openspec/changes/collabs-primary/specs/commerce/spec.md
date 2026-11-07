## ADDED Requirements

### Requirement: Shopify Collabs discount and tracking continuity

The storefront SHALL support Shopify personalized redirects, same-origin discount landing and the published Shopify analytics/privacy runtime while preserving the existing Shopify-owned market, price, stock and hosted checkout behavior. Tracking parameters and request-specific cookies SHALL survive the relevant handoffs without being shared between shoppers or leaked to unapproved origins. Analytics SHALL respect consent and failures SHALL NOT block ordinary shopping.

#### Scenario: Collabs discount link starts a checkout

- **WHEN** a shopper enters a valid discount link with Collabs tracking parameters and a safe return path
- **THEN** the storefront preserves the tracking context and Shopify validates the requested code on the cart with the shopper's existing market

#### Scenario: Tracking service fails

- **WHEN** analytics cannot initialize or send an event
- **THEN** normal shopping remains usable and no successful analytics or paid order is fabricated

#### Scenario: Unsafe discount return path

- **WHEN** a discount link includes an off-site, encoded bypass, admin/API path or redirect loop as its destination
- **THEN** it cannot redirect to that destination or expose credentials or tracking data
