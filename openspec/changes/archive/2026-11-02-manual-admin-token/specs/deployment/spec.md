## MODIFIED Requirements

### Requirement: Unified Docker deployment

Remote upload and server updates SHALL use one validated deployment pipeline. Uploaded source SHALL not require git pull. Full KOL deployment SHALL start separate app and admin containers with distinct image tags, with kol-worker reusing the admin image and calling admin over the Docker network. Independent scopes SHALL replace only their selected services and permit initial storefront then admin releases. Both applications SHALL share the existing SQLite volume/path and matching active KOL/shop configuration. Explicit `--kol` and admin-only deployment SHALL enable KOL for that command before Compose resolution, overriding an absent or false runtime-file or inherited-shell switch, and SHALL preserve that choice and service scope across Git reload. Deployment without explicit KOL enablement SHALL honor the configured switch. Explicit KOL deployment SHALL still fail when required configuration is missing, but `SHOPIFY_ADMIN_TOKEN` SHALL be optional. Check-only and dry-run operations SHALL not deploy services or modify private runtime files. Settlement enablement SHALL never be implied by KOL deployment.

#### Scenario: Manual source upload

- **WHEN** an operator runs the full deployment script from a source archive
- **THEN** it deploys through Docker without requiring a git checkout

#### Scenario: KOL config missing

- **WHEN** an explicit KOL deployment lacks required internal authentication or HTTPS origin configuration
- **THEN** it fails before rebuilding/replacing running services and reports missing configuration key names without their values

#### Scenario: Explicit enablement with template default

- **WHEN** the private runtime file contains `KOL_ENABLED=false` or omits the switch and the operator selects `--kol`
- **THEN** Compose uses `KOL_ENABLED=true` for this command, preserves the selected service scope, and leaves the private file and settlement switch unchanged

## ADDED Requirements

### Requirement: Manually managed Shopify Admin access token

Offy SHALL accept optional `SHOPIFY_ADMIN_TOKEN` from the selected server-private runtime configuration without requiring client credentials, automatic token acquisition or renewal. Missing tokens SHALL NOT block management deployment or login. Independent admin and storefront releases SHALL permit an older Admin token in the running peer and SHALL retain checks for database/volume, shop identity, active KOL settings and shared authentication. Owner, worker heartbeat and ingress checks SHALL remain required. Readiness output SHALL identify whether Admin credentials are configured without exposing them or claiming successful Shopify synchronization. Operators SHALL supply a valid Admin API token with required scopes when enabling remote operations, replace expiring/revoked tokens manually and recreate the admin service through the existing deployment rather than merely restarting its old environment.

#### Scenario: Manual token replacement with storefront running

- **WHEN** an operator updates only `SHOPIFY_ADMIN_TOKEN` in the selected runtime file and runs the admin-only deployment
- **THEN** the older storefront token does not block deployment, only admin/worker are updated, and existing backup and readiness checks still run

#### Scenario: Later independent storefront release

- **WHEN** a running admin has a different Admin API token but matching shared configuration
- **THEN** storefront-only deployment may proceed without changing that admin or ignoring shared shop/database/authentication drift

#### Scenario: No Admin token configured

- **WHEN** the token is empty and all required configuration is valid
- **THEN** deployment can succeed with a fresh paused worker heartbeat and valid local owner/shop/ingress, and explicitly reports Shopify Admin as unconfigured
