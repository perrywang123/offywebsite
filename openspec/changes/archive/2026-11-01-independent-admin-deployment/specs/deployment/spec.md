## MODIFIED Requirements

### Requirement: Unified Docker deployment

Remote upload and server updates SHALL use one validated deployment pipeline. Uploaded source SHALL not require git pull. Enabling KOL SHALL start separate app and admin containers with distinct image tags, with kol-worker reusing the admin image and calling admin over the Docker network. Both applications SHALL share the existing SQLite volume/path and matching KOL/shop configuration. Explicit KOL deployment SHALL fail when KOL is disabled or required configuration is missing. Check-only and dry-run operations SHALL not deploy services.

#### Scenario: Manual source upload

- **WHEN** an operator runs the deployment script from a source archive
- **THEN** it deploys through Docker without requiring a git checkout

#### Scenario: KOL config missing

- **WHEN** an explicit KOL deployment lacks secrets, HTTPS origin or Shopify Admin configuration
- **THEN** it fails before rebuilding/replacing running services and reports only configuration key names

## ADDED Requirements

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
