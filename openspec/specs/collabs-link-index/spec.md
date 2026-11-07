# collabs-link-index Specification

## Purpose

Provide validated Offy short links for native Collabs cooperation before official reports are available, with explicit pending reconciliation and one-time source identity binding that preserves existing data and storefront operation.

## Requirements

### Requirement: Independent short link onboarding

The system SHALL allow an authenticated administrator to create a unique Offy short link using a validated official Collabs destination before a report creator identity is available. An omitted, null or blank report identity SHALL be stored as NULL, never as a fabricated source identity. Multiple unbound creator records SHALL be allowed.

#### Scenario: First collaboration has no official report

- **WHEN** the administrator saves a valid official destination and a new alias without a report identity
- **THEN** the short link is enabled, the record has a null report identity and the interface explicitly shows that report matching is pending

### Requirement: One-time report identity binding

The system SHALL allow a previously unbound record to bind a unique nonempty report creator identity while preserving its alias and record identity. A bound report identity SHALL NOT be changed, cleared or reassigned through an edit. Existing audit controls SHALL record the binding.

#### Scenario: Administrator obtains the real report identity

- **WHEN** an administrator supplies a source identity for an unbound record
- **THEN** the same record is updated and subsequent changes or removal of that identity are rejected

#### Scenario: Report identity is already reserved

- **WHEN** an administrator attempts to bind a source identity used by another record
- **THEN** the operation is rejected without modifying either record

### Requirement: Explicit pending reconciliation evidence

The system SHALL exclude unbound records from creator matching and SHALL NOT infer report identity from a name or alias. The workspace and reconciliation results SHALL identify pending bindings. Independent Shopify order checks MAY continue but SHALL NOT claim to verify creator attribution or commission payout.

#### Scenario: Report name resembles an unbound collaboration

- **WHEN** a report creator equals an unbound record's display name or alias
- **THEN** the source creator remains unmapped, pending binding is disclosed and official report values remain unchanged

### Requirement: Preserve existing data and storefront readers

The migration SHALL preserve existing link records, bound report identities and unique alias/source constraints. Existing storefront readers SHALL continue to resolve enabled destinations with null report identities. Deployment SHALL replace only the administrator services, without rebuilding or restarting the storefront.

#### Scenario: Existing storefront reads a newly unbound collaboration

- **WHEN** the previous storefront schema reads the migrated shared database
- **THEN** it can read the existing and newly created enabled aliases and destinations without a fabricated report identity

### Requirement: Unique official tracking bindings

New cooperation records and changed tracking bindings SHALL NOT reuse another record's official dt_id or discount code. Comparison SHALL ignore landing paths and unrelated query parameters, use decoded tracking values and case-insensitive discount codes, and include disabled records. The check and mutation SHALL execute in one immediate write transaction. Ambiguous duplicate dt_id parameters SHALL be rejected. A rejected mutation SHALL preserve existing records and audit history.

#### Scenario: Same dt_id with another landing page

- **WHEN** an administrator saves a new or changed record using another record's dt_id with a different path or UTM parameters
- **THEN** the operation is rejected with a clear duplicate tracking explanation and no record or audit mutation

#### Scenario: Disabled record retains its tracking identity

- **WHEN** a new record attempts to use a disabled record's official tracking identity
- **THEN** the binding is rejected rather than implicitly transferring that identity

### Requirement: Preserve and disclose legacy duplicate bindings

The workspace SHALL disclose preexisting duplicate tracking bindings. Existing records SHALL NOT be automatically deleted, reassigned or disabled. Changes that introduce no new tracking identity, including display-name, status and report-identity maintenance, SHALL remain possible. Changing a binding to a conflicting identity SHALL be rejected; assigning a distinct unreserved official identity SHALL remain possible.

#### Scenario: Historical internal-test links share one dt_id

- **WHEN** the administrator opens the workspace or edits only one such record's display name or status
- **THEN** duplicate aliases are disclosed, existing data and redirect behavior remain intact and the unchanged tracking binding does not block maintenance
