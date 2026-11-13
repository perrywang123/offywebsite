## ADDED Requirements

### Requirement: Recoverable administrator collaboration cleanup

An authenticated administrator SHALL be able to manually archive a selected collaboration after providing a reason and explicit confirmation. The archive SHALL disable the Offy short link and remove the record from the normal cooperation list. The operation SHALL atomically record archive metadata and an audit entry, and repeated archive requests SHALL be idempotent. It SHALL NOT delete native attribution, reports, observations or reserved identity, or modify official Collabs cooperation, discounts, commission or payments. Cooperation expiry SHALL NOT be guessed from local inactivity.

#### Scenario: Administrator cleans a test collaboration

- **WHEN** the administrator confirms archival of a named test record with a reason
- **THEN** its Offy short link is disabled, its record is shown in the recoverable archive and its original evidence and official cooperation remain unchanged

#### Scenario: Administrator restores an ended collaboration

- **WHEN** the administrator restores an archived record
- **THEN** the same identity returns to the normal list with its short link still disabled and a restoration audit entry

#### Scenario: Archived identity cannot be reassigned or reenabled by an edit

- **WHEN** another record attempts to reuse an archived alias or tracking identity, or an ordinary edit targets the archived record
- **THEN** the mutation is rejected without changing data; restoration is required before editing the original record

### Requirement: Preserve evidence across administrator-only archive deployment

Archive storage SHALL be additive and compatible with the currently deployed storefront reader. Financial reconciliation and existing official identity mappings SHALL continue to include archived identities. New official identity bindings to archived records SHALL be rejected. The release SHALL replace only administrator services, preserving the running storefront and payment configuration.

#### Scenario: Archived creator has an existing report and native order

- **WHEN** the record is archived and the previous storefront reads the shared database
- **THEN** its enabled field is false, report and native order evidence remain readable, the native identity stays bound and no storefront restart is required
