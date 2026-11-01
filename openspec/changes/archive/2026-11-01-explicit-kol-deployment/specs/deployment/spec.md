## MODIFIED Requirements

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

## ADDED Requirements

### Requirement: Deterministic runtime file selection

Server deployment SHALL use an explicitly selected runtime file when provided, otherwise prefer the existing project `.env`, otherwise use `.env.production`. It SHALL fail if the selected file is absent and SHALL NOT silently fall back from an absent explicit file or merge multiple files. The selected path SHALL remain stable across Git reload and be identified in deployment messages without printing its contents. Required KOL configuration missing from the resolved environment SHALL be reported together where possible. No private runtime file, credential, or database SHALL be committed as a deployment fix; test fixture values SHALL NOT be used as production runtime configuration.

#### Scenario: Production-named runtime file

- **WHEN** the server has `.env.production` but no `.env`
- **THEN** normal and check-only deployment select `.env.production` without copying or modifying it

#### Scenario: Existing primary and explicit selection

- **WHEN** both project runtime files exist
- **THEN** `.env` takes precedence unless `--env-file` explicitly selects another file; a missing explicit selection fails before service changes
