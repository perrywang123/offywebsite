## Why

An administrator can verify an ad source using a signed Offy checkout, but a Shop order has no Offy checkout reference. Some orders also have a Shopify visit with an ad ID that Offy did not retain.

## What Changes

- Look up an exact Shopify order by number when the local order has no ad ID or no local checkout.
- Show Shopify's sales channel and the ad ID recorded in its visit data when the available evidence supports one ID. Show when Shopify has incomplete data or an order has no usable ad evidence.
- Keep the Shopify lookup out of the local funnel, checkout, order synchronization and Meta delivery paths.

## Capabilities

### Modified Capabilities

- `meta-funnel`: authenticated order lookup supplements local evidence with read-only Shopify order and visit fields.

## Impact

- Extends the existing Offy Meta diagnostics page and its authenticated orders endpoint.
- Uses the existing Shopify Admin API order credentials. The lookup requires no new Shopify or Meta configuration.
