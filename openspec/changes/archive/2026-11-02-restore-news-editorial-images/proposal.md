## Why

The owner reports that The Latest from OFFY lost its five curated local photographs. Git history confirms commit `808d9b8` replaced the configured editorial images with Shopify product images. The original assets and mappings remain intact in `src/lib/content.ts` and `public/assets/news/`, including the pre-change mapping from `808d9b8^`.

## What Changes

- Restore the feature and four secondary images from the existing editorial configuration: `news-01.jpg`, `news-04.jpg`, `news-03.jpg`, `news-08.jpg`, `news-02.jpg`.
- Stop overwriting editorial images or requiring a Shopify primary image for a NEWS card.
- Keep current market/product availability verification and product-handle links, layout, copy, Shopify prices/inventory and checkout unchanged.
- Add homepage regressions, update the current design/data-source contract and capture browser screenshots for the restored section.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `brand-site`: NEWS images are configured editorial assets, distinct from Shopify product facts.

## Impact

Homepage presentation, regression tests and current documentation. No replacement images, commercial snapshots, catalog fallbacks, schema, backend or payment changes. Original local asset files remain unchanged.
