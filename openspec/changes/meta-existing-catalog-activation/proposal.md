## Why

The production Meta funnel is enabled but its catalog mapping is empty. The owner requests activation before advertising, prioritizing the US, and explicitly forbids adding or publishing products or creating a catalog without further confirmation.

## What Changes

- Store only ID mappings verified against the existing Meta catalog and live Shopify variants. No prices, inventory or other commercial snapshots are introduced.
- Provide a checkable configuration command which updates only META_CATALOG_IDS, preserves credentials and commerce configuration, and creates a private recovery backup.
- Reload existing production images without a build, then verify consented product events, CAPI delivery and the existing checkout path.
- Document unresolved catalog coverage and Shopify-domain landing links without changing publication, catalog membership, market availability or checkout.

## Capabilities

No new application capability. This change activates an existing optional configuration and adds deployment tooling. The existing meta-funnel specification remains applicable.

## Impact

Affected paths: config/meta-catalog-ids.json, deploy/configure-meta-catalog.py, deployment tests and current Meta operational documentation. No application source, schema, product publication, domain binding, ad publication or payment changes.
