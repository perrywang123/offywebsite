## ADDED Requirements

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
