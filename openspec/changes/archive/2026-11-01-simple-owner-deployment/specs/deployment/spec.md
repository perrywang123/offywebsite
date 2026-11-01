## MODIFIED Requirements

### Requirement: Deterministic runtime file selection

Server deployment SHALL use an explicitly selected runtime file when provided, otherwise prefer the existing project `.env`, otherwise use `.env.production`. It SHALL fail if the selected file is absent and SHALL NOT silently fall back from an absent explicit file or merge multiple files. The selected path SHALL remain stable across Git reload and be identified in deployment messages without printing its contents. Required KOL configuration missing from the resolved environment SHALL be reported together where possible. Except for the explicitly owner-authorized server-only salted login password verifier, no private runtime file, credential, or database SHALL be committed as a deployment fix; test fixture values SHALL NOT be used as production runtime configuration.

#### Scenario: Production-named runtime file

- **WHEN** the server has `.env.production` but no `.env`
- **THEN** normal and check-only deployment select `.env.production` without copying or modifying it

#### Scenario: Existing primary and explicit selection

- **WHEN** both project runtime files exist
- **THEN** `.env` takes precedence unless `--env-file` explicitly selects another file; a missing explicit selection fails before service changes

## ADDED Requirements

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
