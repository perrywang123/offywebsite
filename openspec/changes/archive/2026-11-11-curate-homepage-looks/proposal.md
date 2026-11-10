# Why

The homepage currently combines two newest-created products from each series, permits regional products in both recommendation and regional grids, and scales cards to an oversized three-column layout. The owner approved a dedicated Shopify curated collection with the current time-based selection as a live-data fallback.

# What Changes

- Prefer `home-featured`, preserving Shopify's collection order. Missing/unreadable collection uses the existing newest-created, two-per-series selection, excluding regionals before taking each series limit.
- Keep all three original series mappings, pages, membership and ordering independent.
- Show regional products only in a separate destination-aware section. Classification must be complete before publishing recommendations for configured target markets.
- Introduce homepage-only square image cards, bounded three-column desktop/two-column mobile layout and compact regional cards; replace the dense circular roster with three series navigation links.
- Distinguish curated Featured Looks, fallback New Looks, successful empty selection and upstream outage.

# Capabilities

- Modify `brand-site`: homepage merchandising and presentation.

# Impact

Homepage data orchestration/components, additive strict regional-read option, tests and documentation. Product/series pages, Shopify configuration, prices, inventory, checkout, administration and deployment remain unchanged. No production release before owner screenshot review.
