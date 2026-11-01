## ADDED Requirements

### Requirement: Independent server-side storefront deployment

The project SHALL provide `deploy/update-storefront.sh` selecting an exclusive `--storefront-only` scope in the existing shared pipeline. Default execution SHALL fast-forward its configured Git upstream and reload updated code under the same project lock while preserving scope, runtime-file selection and explicit KOL enablement. It SHALL build only the app image using the existing CPU budget, back up the shared SQLite database before replacement, start app with `--no-deps` and verify app health. It SHALL NOT build, replace, stop or execute readiness checks in admin/worker, or install/reload Nginx. Existing service ports, private files, image separation and persistent data volume SHALL remain intact. Storefront-only SHALL honor the configured KOL switch unless `--kol` explicitly enables it; it SHALL NOT disable KOL to achieve service isolation. Conflicting admin-only and storefront-only scopes SHALL fail before Docker or Git operations. Default independent releases SHALL require a Git checkout, with explicit skip-pull for deliberately prepared source and read-only check mode.

#### Scenario: Update storefront with management already running

- **WHEN** an operator executes the storefront-only entrypoint
- **THEN** only app is built/backed up/replaced and verified, and all admin/worker/proxy lifecycle operations remain untouched even when KOL is enabled

#### Scenario: Bootstrap KOL in two releases

- **WHEN** the operator first executes storefront-only with `--kol` and then admin-only
- **THEN** the first release enables KOL on app without requiring admin/worker availability, and the second release verifies the updated app before independently deploying admin/worker and checking HTTPS boundaries

#### Scenario: Existing management configuration differs

- **WHEN** an existing running admin has a different real database volume/path or shop identity, or an already KOL-enabled admin has different shared KOL settings
- **THEN** storefront-only fails before image build or service replacement, reports configuration key names only, and does not silently change the peer

#### Scenario: Disabled legacy management

- **WHEN** a running legacy admin has KOL disabled and matches the database/shop identity
- **THEN** storefront-only may enable KOL on app first without restarting that legacy admin, and admin-only may subsequently upgrade it after verifying app

#### Scenario: Failure during independent release

- **WHEN** Git pull, peer validation, build, database backup or app health fails
- **THEN** the release returns a nonzero result and never compensates by rebuilding/restarting admin or worker; failed health does not imply automatic rollback

## MODIFIED Requirements

### Requirement: Unified Docker deployment

Remote upload and server updates SHALL use one validated deployment pipeline. Uploaded source SHALL not require git pull. Full KOL deployment SHALL start separate app and admin containers with distinct image tags, with kol-worker reusing the admin image and calling admin over the Docker network. Independent scopes SHALL replace only their selected services and permit initial storefront then admin releases. Both applications SHALL share the existing SQLite volume/path and matching active KOL/shop configuration. Explicit `--kol` and admin-only deployment SHALL enable KOL for that command before Compose resolution, overriding an absent or false runtime-file or inherited-shell switch, and SHALL preserve that choice and service scope across Git reload. Deployment without explicit KOL enablement SHALL honor the configured switch. Explicit KOL deployment SHALL still fail when required configuration is missing. Check-only and dry-run operations SHALL not deploy services or modify private runtime files. Settlement enablement SHALL never be implied by KOL deployment.

#### Scenario: Manual source upload

- **WHEN** an operator runs the full deployment script from a source archive
- **THEN** it deploys through Docker without requiring a git checkout

#### Scenario: KOL config missing

- **WHEN** an explicit KOL deployment lacks secrets, HTTPS origin or Shopify Admin configuration
- **THEN** it fails before rebuilding/replacing running services and reports missing configuration key names without their values

#### Scenario: Explicit enablement with template default

- **WHEN** the private runtime file contains `KOL_ENABLED=false` or omits the switch and the operator selects `--kol`
- **THEN** Compose uses `KOL_ENABLED=true` for this command, preserves the selected service scope, and leaves the private file and settlement switch unchanged

### Requirement: Persistent data and readiness

Deployment SHALL keep the existing Compose project/volume, create a consistent SQLite backup before service replacement, avoid volume deletion and global image pruning, and verify health for the selected service scope before reporting success. Full and admin-only KOL releases SHALL verify production owner and recent worker health; storefront-only SHALL verify app health without requiring a management service to exist. Failed readiness SHALL produce a nonzero result.

#### Scenario: Existing database

- **WHEN** a new image is built for a deployment
- **THEN** an online backup completes before selected service replacement and the existing database is migrated by the normal entrypoint

### Requirement: Explicit proxy management

Full and admin-only KOL deployment SHALL verify public/admin HTTPS access boundaries. Storefront-only SHALL preserve existing proxy configuration and SHALL NOT require an admin HTTPS endpoint to be ready; initial management HTTPS validation occurs in the subsequent admin release. Optional proxy installation SHALL require an explicit target and TLS files, render secrets only into private files, preserve the old config, test Nginx before reload and restore the prior file if validation fails. Tools SHALL not obtain certificates, open firewall ports or guess an existing site's config path.

#### Scenario: Invalid proxy candidate

- **WHEN** the selected Nginx configuration fails validation
- **THEN** the prior configuration file is restored and the deployment reports failure without reloading the invalid config
