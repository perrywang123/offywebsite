## MODIFIED Requirements

### Requirement: Optional Shopify Admin connectivity

Management login, local cooperation/accounting records and checkout diagnostics SHALL remain available without Shopify Admin credentials. The worker SHALL skip Shopify calls and preserve queued inbox/code tasks, scan cursors and successful-scan timestamps while unconfigured; it SHALL still perform local retention cleanup and publish a fresh heartbeat identifying the paused Shopify state. Explicit remote reads, manual synchronization and Shopify-dependent writes SHALL fail with a clear configuration error rather than fabricate results or report synchronization success. The management interface SHALL distinguish absent credentials, a running local worker and successful Shopify synchronization. Supplying valid manual or automatic credentials SHALL resume existing work without resetting task history. Configured authorization failures and financial verification requirements SHALL remain enforced.

#### Scenario: Worker runs before credentials are provided

- **WHEN** the worker runs with no manual token or application credentials
- **THEN** it makes no Shopify requests, does not consume queued work or advance scan state, performs local maintenance and records that Shopify synchronization is paused

#### Scenario: Explicit Shopify operation without credentials

- **WHEN** an authenticated administrator requests synchronization or another Shopify-dependent operation without credentials
- **THEN** that operation returns a clear unconfigured error, while local management data and diagnostics remain accessible

#### Scenario: Credentials later supplied

- **WHEN** an administrator injects a valid manual token or complete application credentials and updates only the management service
- **THEN** existing pending work and scans resume without resetting history or updating the storefront

## ADDED Requirements

### Requirement: Automatic Admin token lifecycle

The management backend SHALL support client credentials token acquisition using an installed application, without requesting additional scopes. A complete Client ID and Client Secret pair SHALL take precedence over a manual Admin token; a partial pair SHALL fail remote operations with an incomplete-configuration error rather than silently fall back. Without a pair, manual token behavior SHALL remain supported. Automatic tokens SHALL be kept only in server memory, renewed ahead of the response-derived expiry, and acquired through a single shared in-flight exchange per process/configuration. Failures SHALL be sanitized and rate-limited; expired or rejected tokens SHALL never be used. A still-valid cached token MAY be used after proactive renewal failure. Authentication recovery SHALL replay an Admin operation at most once after HTTP 401 in automatic mode; other authorization, GraphQL and transport failures SHALL not cause automatic operation replay.

#### Scenario: Long-running worker and concurrent requests

- **WHEN** a token is absent or approaching expiry and multiple remote operations start
- **THEN** the backend performs one credential exchange, uses its token, and renews again on later demand without manual environment edits or restarts

#### Scenario: Shopify rejects authentication or permissions

- **WHEN** an automatic Admin request returns 401
- **THEN** the rejected token is invalidated and the operation is retried at most once with a newly acquired or concurrently refreshed token; a permission denial or GraphQL error does not trigger token exchange or replay

#### Scenario: Renewal unavailable

- **WHEN** credential exchange fails or returns malformed token/expiry data
- **THEN** the backend exposes only a fixed sanitized error and suppresses repeated exchanges during a cooldown; after hard expiry it cannot fall back to the expired token

### Requirement: Admin application credential isolation

New Client ID and Client Secret configuration SHALL be optional server-only runtime configuration, supplied only to the admin service. They SHALL NOT enter the storefront, worker, build arguments, images, browser responses or database. Credential exchange SHALL target a validated HTTPS Shopify shop domain and reject redirects, except for explicitly guarded loopback integration transport. Independent admin deployment SHALL remain available without changing storefront credentials or requiring matching Admin application secrets in the storefront.

#### Scenario: Independent management deployment

- **WHEN** application credentials are configured and the management service is deployed independently
- **THEN** only admin receives them, the worker continues calling admin by internal RPC, and the running storefront retains its existing Storefront credentials and lifecycle
