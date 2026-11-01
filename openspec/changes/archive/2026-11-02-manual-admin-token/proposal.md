## Why

The owner wants to inject Shopify Admin API access tokens manually on the server, without automatic token exchange or renewal. Management login, local records and checkout diagnostics must also remain available without this optional token. Currently deployment and the worker require it, and peer compatibility blocks independent token changes.

## What Changes

- Preserve `SHOPIFY_ADMIN_TOKEN` as the server-only, manually supplied Admin API token; add no client credentials or automatic renewal.
- Permit independent releases when the running peer has an older Admin token, while preserving checks for shop, database, active KOL settings and shared authentication.
- Make the Admin token optional for deployment. Without it, keep local worker maintenance and a fresh heartbeat, pause Shopify background work without consuming tasks, and report the paused state separately from successful synchronization.
- Fail explicit Shopify operations with a clear configuration error without disabling local management. Preserve configured-token permission failures and settlement verification gates.
- Document where to inject the token, how to apply it through the existing admin-only deployment, required Shopify permissions and token-expiry responsibilities.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `deployment`: optional, manual Shopify Admin token configuration and independent rotation.
- `kol-platform`: local management availability without Admin API connectivity.

## Impact

Deployment validation, worker, admin status/API feedback, regression tests, public environment templates and operations documentation. No commerce, authentication, schema, port or automatic token-fetch changes. Existing admin-only deployment still builds the admin image, backs up the shared database, recreates the selected services and verifies readiness.
