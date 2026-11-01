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

Remote upload and server updates SHALL use one validated deployment pipeline. Uploaded source SHALL not require git pull. Enabling KOL SHALL start separate app and admin containers with distinct image tags, with kol-worker reusing the admin image and calling admin over the Docker network. Both applications SHALL share the existing SQLite volume/path and matching KOL/shop configuration. Explicit `--kol` and admin-only deployment SHALL enable KOL for that command before Compose resolution, overriding an absent or false runtime-file or inherited-shell switch, and SHALL preserve that choice across Git reload. Ordinary deployment without either mode SHALL continue to honor the configured switch. Explicit KOL deployment SHALL still fail when required configuration is missing. Check-only and dry-run operations SHALL not deploy services or modify private runtime files. Settlement enablement SHALL never be implied by KOL deployment.

#### Scenario: Manual source upload

- **WHEN** an operator runs the deployment script from a source archive
- **THEN** it deploys through Docker without requiring a git checkout

#### Scenario: KOL config missing

- **WHEN** an explicit KOL deployment lacks secrets, HTTPS origin or Shopify Admin configuration
- **THEN** it fails before rebuilding/replacing running services and reports missing configuration key names without their values

#### Scenario: Explicit enablement with template default

- **WHEN** the private runtime file contains `KOL_ENABLED=false` or omits the switch and the operator selects `--kol`
- **THEN** Compose uses `KOL_ENABLED=true` for this command, all other checks remain active, and the private file and settlement switch remain unchanged

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

### Requirement: Deterministic runtime file selection

Server deployment SHALL use an explicitly selected runtime file when provided, otherwise prefer the existing project `.env`, otherwise use `.env.production`. It SHALL fail if the selected file is absent and SHALL NOT silently fall back from an absent explicit file or merge multiple files. The selected path SHALL remain stable across Git reload and be identified in deployment messages without printing its contents. Required KOL configuration missing from the resolved environment SHALL be reported together where possible. Except for the explicitly owner-authorized server-only salted login password verifier, no private runtime file, credential, or database SHALL be committed as a deployment fix; test fixture values SHALL NOT be used as production runtime configuration.

#### Scenario: Production-named runtime file

- **WHEN** the server has `.env.production` but no `.env`
- **THEN** normal and check-only deployment select `.env.production` without copying or modifying it

#### Scenario: Existing primary and explicit selection

- **WHEN** both project runtime files exist
- **THEN** `.env` takes precedence unless `--env-file` explicitly selects another file; a missing explicit selection fails before service changes

### Requirement: Automatically managed internal authentication

Explicit KOL deployment SHALL automatically prepare missing internal ingress, referral signing, and worker authentication values without requiring the operator to configure them. Existing resolved values SHALL be preserved; missing values SHALL reuse a matching running container or server-private persisted values before generating distinct cryptographically random values. The server-private file SHALL be mode 0600 and excluded from Git, Docker build context and source synchronization. Preparation SHALL share the deployment lock, remain stable across Git reload and never rotate established values silently. Check-only SHALL NOT persist generated values or modify private runtime files. All Compose services and proxy rendering SHALL use the prepared values and retain existing authentication checks.

#### Scenario: First deployment without internal secrets

- **WHEN** the operator deploys with the three internal environment values absent
- **THEN** internal values are prepared automatically, persisted privately only on real deployment, and reused on later deployments without revealing them

#### Scenario: Existing deployment and check-only

- **WHEN** private persisted values or matching running container values exist
- **THEN** they are reused; mismatched sources fail rather than rotating keys, and check-only never writes the server-private file

### Requirement: Optional Shopify event delivery

Absent Shopify webhook signing configuration SHALL NOT block management login or deployment. The public webhook handler SHALL reject requests while unconfigured and SHALL continue verifying signatures when configured. Existing Admin API incremental scans and explicit financial reconciliation SHALL remain available with their existing permissions and freshness requirements. Deployment SHALL not imply event subscription readiness or enable settlements.

#### Scenario: Shopify notification not connected

- **WHEN** the webhook signing secret is empty
- **THEN** management remains available, existing scheduled scans continue, and notification ingestion is unavailable rather than accepting unsigned requests

### Requirement: Isolated build CPU budget

All server deployment image builds SHALL explicitly select a project-specific docker-container BuildKit builder. The builder SHALL enforce a shared CPU CFS budget defaulting to one CPU across storefront/admin build tasks, with a validated host-only `DEPLOY_BUILD_CPUS` override. OCI build parallelism SHALL be one. Running application/worker service resource settings, public ports, persistent business volumes, and independent admin deployment scope SHALL remain unchanged. The builder SHALL load built images to the local Docker image store and preserve its private build cache between releases without changing the user's global default builder.

#### Scenario: Full release on a two-core server

- **WHEN** the operator executes the existing full deployment command
- **THEN** both requested image builds use the same explicitly selected builder with one aggregate CPU by default and service replacement starts only after successful capped builds and existing backups

#### Scenario: Independent backend release

- **WHEN** the operator deploys only the management system
- **THEN** only admin is built using the same capped builder and the storefront is not rebuilt or restarted

### Requirement: Verified build isolation preflight

Deployment SHALL check Compose builder selection support, Buildx automatic image-load support, and Docker CPU quota/period support. Existing dedicated builder configuration and its bootstrapped container's actual driver/CPU quota/period SHALL be verified before submitting image builds. Unsupported capability or drift SHALL fail before any image build, application replacement or database migration, with no silent fallback to an unrestricted builder. Check-only SHALL not create, start, update or remove builders or their caches. This guarantee SHALL apply to builds newly started by the updated pipeline, not previously running host processes, unrelated builders or Docker daemon work outside the builder cgroup.

#### Scenario: Unsupported engine or modified builder

- **WHEN** quota support is unavailable or a dedicated builder's declared/actual limits do not match the configured budget
- **THEN** deployment fails before building/replacing services and leaves existing builders, caches and applications intact

#### Scenario: Read-only preflight

- **WHEN** an operator runs `--check` on an unprepared server
- **THEN** version/capability checks and the planned budget are reported without creating or bootstrapping the dedicated builder
