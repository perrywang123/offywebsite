# Homepage merchandising

Use a dedicated `home-featured` collection. Its existing products and collection order are Shopify-authoritative; it is never added to SERIES_SHOPIFY_HANDLE or used as a product's primary series. Read in the destination context and retain up to six available non-merch, nonregional products in merchant order, deduplicating identities. Candidates must also belong to one of the three existing series. A valid empty/fully filtered collection remains empty. A missing or failed curated collection alone falls back to the original newest-created two-per-series selection; exclude regional identities before taking the limits, preserving group order and missing-date behavior. No local commercial fallback is introduced.

Reuse existing current-market regional visibility comparisons with an additive strict option for the homepage. An incomplete classification is unavailable, rather than treating unknown products as globally eligible. Existing callers retain their previous behavior. Do not label multi-country availability as a single-country exclusive. All current commerce fields, currency and images remain from successful Shopify reads.

# Visual direction

Make each OFFY easy to compare: complete photography on a quiet square canvas, readable name and price immediately below, and a calmer independent regional edit. Keep the brand's #f7f7f9 canvas, #1d1915 text, #525252 secondary text, #e3e3e3 dividers and white image surfaces. Existing system/display fonts remain. The main module caps at 1280px, three desktop columns/two mobile columns with 16/24px gaps. Regional cards cap their width and do not stretch a single product across the screen. Focus is visible; information never depends on hover; reduced motion disables image scaling. The existing five editorial NEWS images remain unchanged.

Use one heading, Featured Looks for curated mode and New Looks for live fallback, with Shop all looks. Offer the three existing series as explicit navigation instead of the repeated circular product roster. Main and regional products use disjoint identities. No new Shopify products, collection or sales-channel publication is created by this implementation.

# Validation

Test curated order, more than six items, duplicates, current-market availability/currency, merch and regional exclusions, absent/failed/empty curated collection, incomplete regional probes, fallback refill-before-limit and original series integrity. Browser-check real Shopify fallback on US/GB plus an isolated local Shopify adapter for curated states without production writes; screenshots at desktop/wide, 768px and 375/320px. Stop before checkout creation or payment. Do not publish production until screenshot review.
