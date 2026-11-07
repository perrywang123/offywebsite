# Refine Collabs link management and daily counts

## Why

The owner requests numeric zero instead of “未采集” in the administrator's daily request-count table and explicitly requests preventing duplicate official tracking bindings for real KOL onboarding. Questions about dt_id landing views and unique visitors need an accurate explanation and a proposed measurement contract, not an unapproved change to tracking or the purchase journey.

## What Changes

- Render null daily request-count cells as 0, with an adjacent explanation that uncollected history has no recorded requests and does not prove no visits occurred.
- Preserve the API's null values, collection timestamps, unknown-history chart and existing count calculation.
- Document actual redirect findings and proposed dt_id landing PV / anonymous browser UV boundaries as pending work.
- Reject new or changed official tracking identities already attached to another record, including disabled records; compare canonical dt_id and discount-code identities instead of complete URLs.
- Preserve legacy duplicate test records and unchanged edits, disclose collisions and never automatically delete, reassign or disable links.

## Capabilities

- Modified: `collabs-observation` — daily table presentation only.
- Added: `collabs-link-index` — unique official tracking bindings with non-destructive legacy handling.

## Impact

Admin service and components, tests and documentation. No schema changes, new cookies, personal identifiers, storefront tracking, Shopify configuration, attribution or payment changes. Only the admin image needs deployment.
