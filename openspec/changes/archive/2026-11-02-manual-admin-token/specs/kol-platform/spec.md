## ADDED Requirements

### Requirement: Optional Shopify Admin connectivity

Management login, local cooperation/accounting records and checkout diagnostics SHALL remain available without a Shopify Admin token. The worker SHALL skip Shopify calls and preserve queued inbox/code tasks, scan cursors and successful-scan timestamps while unconfigured; it SHALL still perform local retention cleanup and publish a fresh heartbeat identifying the paused Shopify state. Explicit remote reads, manual synchronization and Shopify-dependent writes SHALL fail with a clear configuration error rather than fabricate results or report synchronization success. The management interface SHALL distinguish absent credentials, a running local worker and successful Shopify synchronization. Supplying a valid token SHALL resume existing work without resetting task history. Configured-token authorization failures and financial verification requirements SHALL remain enforced.

#### Scenario: Worker runs before credentials are provided

- **WHEN** the worker runs with a missing or blank Admin token
- **THEN** it makes no Shopify requests, does not consume queued work or advance scan state, performs local maintenance and records that Shopify synchronization is paused

#### Scenario: Explicit Shopify operation without credentials

- **WHEN** an authenticated administrator requests synchronization or another Shopify-dependent operation without a token
- **THEN** that operation returns a clear unconfigured error, while local management data and diagnostics remain accessible

#### Scenario: Credentials later supplied

- **WHEN** an administrator injects a valid token and updates only the management service
- **THEN** existing pending work and scans resume, and no automatic token exchange is required
