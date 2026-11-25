## Why

Offy operations need to change homepage campaigns, photography and their destinations from the existing admin without scheduling a storefront release.

## What Changes

- Add 首页配置 to the authenticated admin with editors for the five hero slots, the shared announcement bar and the five Latest from OFFY cards.
- Support uploaded campaign images, storefront or HTTPS destinations, and changes to announcement copy and the hero promotion. Initialize the editor with the current site content.
- Publish one version to the shared SQLite database. Load it on storefront requests and preserve the existing Shopify availability checks for Latest cards that link to Offy product pages.

## Capabilities

### Modified Capabilities

- `brand-site` gains operator-managed homepage content.

## Impact

- Admin navigation, guarded admin API, homepage, shared header, hero and Latest components.
- Add SQLite migrations to persist published settings and uploaded images. Storefront and admin use the existing shared database.
- Shopify remains authoritative for product availability, promotion rules and checkout.
