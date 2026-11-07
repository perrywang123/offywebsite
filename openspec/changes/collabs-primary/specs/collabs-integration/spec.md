## ADDED Requirements

### Requirement: Official Collabs accounting provenance

The system SHALL treat Collabs attribution, commissions and payment results as externally authoritative in Collabs mode. Operator imports SHALL identify their actual source, import time, period, granularity, currencies and available fields. Missing values SHALL remain unknown, and order payment SHALL NOT imply creator payout.

#### Scenario: Commission report has no payout state

- **WHEN** an administrator imports sales and commissions without creator payout evidence
- **THEN** the backend displays the imported commissions and an unknown payout state without creating a local payable or paid record

### Requirement: Explicit and idempotent report import

The system SHALL offer bounded CSV preview and explicit mapping of actual source columns before import, preserve prior observations and operator audit, reject ambiguous values and prevent identical file imports from duplicating data. Overlapping reports SHALL NOT be silently summed.

#### Scenario: Same file is submitted twice

- **WHEN** a previously imported file and mapping are submitted again
- **THEN** the original batch is returned or reported as existing and no amounts or observations are duplicated

#### Scenario: Aggregate export is provided

- **WHEN** the report has creator-level totals but no individual Shopify order identity
- **THEN** its aggregate values remain available without claiming order-level matching or inferred payout

### Requirement: Structured asynchronous operation failures

The authenticated Collabs API SHALL apply the existing safe JSON error boundary to asynchronous operations, including schema validation, invalid report content and upstream failures. Invalid administrator input SHALL return a structured client error without an unhandled rejection, raw server details or partial import.

#### Scenario: Invalid import confirmation

- **WHEN** an authenticated administrator submits an import without confirming its source
- **THEN** the API returns the existing structured 400 validation response, does not import the report, and does not emit an unhandled 500 response

#### Scenario: Asynchronous report operation is rejected

- **WHEN** an asynchronous Collabs operation rejects with a known business error or an unsafe internal error
- **THEN** the API returns the appropriate safe JSON error response and never exposes credentials or internal response details

### Requirement: Mode-appropriate connection information

In Collabs mode, the administrator connection panel SHALL distinguish read-only Shopify connectivity from manual Collabs report import and SHALL NOT offer the legacy accounting scan as if it synchronized Collabs reports. Historical legacy scans and attribution warnings SHALL NOT be presented as current Collabs synchronization status.

#### Scenario: Administrator checks the Collabs connection

- **WHEN** the administrator opens and refreshes connection information in Collabs mode
- **THEN** the interface explains manual report import, refreshes only the read-only connection check, and does not invoke a legacy synchronization mutation

### Requirement: Read-only anomaly reconciliation

The system SHALL compare imported data against Shopify facts only when identifiers, currency and field definitions are compatible, and expose missing evidence and review history. Reconciliation SHALL NOT alter Shopify orders, Collabs commission, payment obligations or refunds.

#### Scenario: Refunded order retains reported commission

- **WHEN** a matched Shopify order is fully refunded and a source report still shows active commission
- **THEN** the system records a review finding with both sources and their timestamps without automatically canceling or paying anything

### Requirement: Official creator link mapping

The system SHALL manage unique reserved aliases mapped to validated official storefront links without deploying new pages. Invalid schemes, external unapproved hosts, admin/API destinations and redirect loops SHALL be rejected. Local labels SHALL NOT assert official creator acceptance or commission settings.

#### Scenario: New creator link

- **WHEN** the administrator saves a valid Collabs storefront link under a new alias
- **THEN** the link resolves dynamically with Collabs tracking parameters preserved and no new local commission session
