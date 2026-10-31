# deployment Specification

## Purpose

Define safe source delivery and the shared Docker deployment pipeline for the storefront and optional KOL management platform.

## Requirements

### Requirement: Safe source delivery

Deployment tools SHALL transfer source for server-side Linux Docker builds, excluding private env files, databases and sidecars, build caches, backups and original resources. Only explicit env-file selection SHALL transfer runtime configuration privately. A source archive SHALL support manual upload without host-native dependencies.

#### Scenario: Private local production env exists

- **WHEN** source is packaged or synchronized
- **THEN** private env values and database contents are excluded while public templates and required runtime scripts remain

### Requirement: Unified Docker deployment

Remote upload and server updates SHALL use one validated deployment pipeline. Uploaded source SHALL not require git pull. Enabling KOL SHALL start separate app and admin containers with distinct image tags, with kol-worker reusing the admin image and calling admin over the Docker network. Both applications SHALL share the existing SQLite volume/path and matching KOL/shop configuration. Explicit KOL deployment SHALL fail when KOL is disabled or required configuration is missing. Check-only and dry-run operations SHALL not deploy services.

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

### Requirement: Independent server-side admin deployment

The project SHALL provide an admin-only server-side deployment entrypoint in the same Git repository. Default execution SHALL require a Git checkout and fast-forward pull its configured upstream, reload updated deployment code under the same deployment lock, and require no remote server/IP argument or source upload. Check-only SHALL avoid Git mutation. Explicit skip-pull SHALL support an already prepared checkout. Admin-only deployment SHALL build/replace only admin and worker, create a consistent shared database backup before replacement, verify admin health/owner/worker/HTTPS boundaries, and SHALL NOT build/restart/stop the storefront. Existing storefront and admin SHALL use the same Compose project and persistent volume. Full deployment SHALL start applications sequentially to avoid concurrent startup migrations.

#### Scenario: Update backend with storefront running

- **WHEN** an operator runs `bash deploy/update-admin.sh` in the server checkout
- **THEN** Git is fast-forwarded, only the admin image is built, only admin and worker are replaced, the existing SQLite volume is reused and the app service is not restarted

#### Scenario: Missing Git checkout or failed pull

- **WHEN** default admin deployment has no Git checkout, tracked local edits or a failed pull
- **THEN** it fails before building/replacing services rather than silently deploying stale source

#### Scenario: Shared configuration drift

- **WHEN** admin has a different database volume/path or KOL signing/shop configuration from app
- **THEN** validation fails before any service replacement

#### Scenario: Separate ingress upstreams

- **WHEN** the KOL proxy configuration is generated
- **THEN** public requests use loopback port 3000 and admin requests use loopback port 3001, with both source ports unavailable externally
