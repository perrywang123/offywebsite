## Why

The existing admin-only entrypoint requires a KOL-capable storefront, but there is no storefront-only release scope. First enablement therefore directs operators to build both images together on a small production server. Operators need to update the storefront first and the management system afterward without rebuilding or restarting the other service.

## What Changes

- Add `deploy/update-storefront.sh` and a mutually exclusive `--storefront-only` scope to the shared pipeline.
- Preserve Git reload, locking, build CPU isolation, SQLite backup, private configuration and normal app health checks while building/replacing app only.
- Permit staged KOL enablement: storefront-only with `--kol`, followed by the existing admin-only entrypoint. Storefront-only does not start/check worker or admin readiness and never installs/reloads Nginx.
- Inspect existing running admin configuration and the real data volume before storefront-only builds. Preserve shared settings of an already enabled admin; an absent or KOL-disabled legacy admin does not require simultaneous release, while its data/shop identity remains protected.
- Update CLI recovery guidance and current deployment documentation. No application UI, Shopify business logic, schema or port changes.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `deployment`: independent storefront releases and sequential initial KOL enablement.

## Impact

`deploy/update.sh`, new storefront wrapper, Compose inspection helper, deployment tests and current documentation. Same repository, Compose project, image tags, ports and persistent SQLite volume. This does not split the Next.js source into separate applications or implement remote prebuilt images; each selected service still compiles the shared application.
