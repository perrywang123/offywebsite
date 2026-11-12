# Why

The existing Meta diagnostic page lists evidence but makes trends and progression difficult to compare. The owner approved the isolated chart preview on 2026-11-13. Independent event counts, browser counts and order counts must not be divided into a misleading funnel.

# What Changes

- Add read-only aggregation of retained observations for daily trends, stage-independent totals, a sequential same-browser funnel, ad-source groups and AddToCart delivery health.
- Introduce global date/source/ad/test filters, preserving separate event/status/stage filters for evidence details.
- Add responsive accessible SVG trends, a proportional four-stage funnel with optional cart branch, source rows and evidence drill-down.
- Preserve existing authenticated ingress and order evidence. Distinguish unknown/stale order sync, observed zero records and Meta final attribution.

# Capabilities

Modified: meta-funnel (read-only visual diagnostics).

# Impact

Admin aggregation, admin UI/styles, tests and operating documentation only. No database migration, new Shopify/Meta permissions, event ingestion, outbox, storefront, purchase or payment changes. Publish a revision-verified prebuilt admin image independently; retain the running storefront and Meta worker.
