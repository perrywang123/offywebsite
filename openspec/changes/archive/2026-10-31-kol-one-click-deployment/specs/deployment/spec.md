## ADDED Requirements

### Requirement: Safe source delivery

Deployment tools SHALL transfer source for server-side Linux Docker builds, excluding private env files, databases and sidecars, build caches, backups and original resources. Only explicit env-file selection SHALL transfer runtime configuration privately. A source archive SHALL support manual upload without host-native dependencies.

#### Scenario: Private local production env exists

- **WHEN** source is packaged or synchronized
- **THEN** private env values and database contents are excluded while public templates and required runtime scripts remain

### Requirement: Unified Docker deployment

Remote upload and server updates SHALL use one validated deployment pipeline. Uploaded source SHALL not require git pull. Enabling KOL SHALL start app and kol-worker using the same image and persistent volume. Explicit KOL deployment SHALL fail when KOL is disabled or required configuration is missing. Check-only and dry-run operations SHALL not deploy services.

#### Scenario: Manual source upload

- **WHEN** an operator runs the deployment script from a source archive
- **THEN** it deploys through Docker without requiring a git checkout

#### Scenario: KOL config missing

- **WHEN** an explicit KOL deployment lacks secrets, HTTPS origin or Shopify Admin configuration
- **THEN** it fails before rebuilding/replacing running services and reports only configuration key names

### Requirement: Persistent data and readiness

Deployment SHALL keep the existing Compose project/volume, create a consistent SQLite backup before service replacement, avoid volume deletion and global image pruning, and verify application health plus production owner and recent worker health before reporting success. Failed readiness SHALL produce a nonzero result.

#### Scenario: Existing database

- **WHEN** a new image is built for a deployment
- **THEN** an online backup completes before app replacement and the existing database is migrated by the normal entrypoint

### Requirement: Explicit proxy management

KOL deployment SHALL verify public/admin HTTPS access boundaries. Optional proxy installation SHALL require an explicit target and TLS files, render secrets only into private files, preserve the old config, test Nginx before reload and restore the prior file if validation fails. Tools SHALL not obtain certificates, open firewall ports or guess an existing site's config path.

#### Scenario: Invalid proxy candidate

- **WHEN** the selected Nginx configuration fails validation
- **THEN** the prior configuration file is restored and the deployment reports failure without reloading the invalid config
