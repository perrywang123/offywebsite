## Why

Some Meta ads send Facebook or Instagram paid UTMs without a separate `ad_id`. Offy misses their existing numeric IDs. Staff also need to start from a Shopify order number and follow the recorded source even when checkout and payment span different days.

## What Changes

- Use one set of supported Meta paid source and medium values to recognize numeric IDs in incoming and retained observations.
- Add order-number search and checkout or payment date selection to Meta diagnostics. Show the evidence for the ad ID and the Shopify order together.
- Read successful sale and capture times during the existing order sync and rescan the retained window once after upgrade.

## Capabilities

### Modified Capabilities

- `meta-funnel` records and exposes order-level source evidence.

## Impact

Touches marketing source normalization, authenticated diagnostics and the read-only Shopify order worker. Requires an additive SQLite migration. Uses the existing retention, marketing permission, signed checkout reference and Shopify Admin API connection. Checkout, hosted payment and Meta event delivery require no new integration.
