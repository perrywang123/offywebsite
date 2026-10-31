## MODIFIED Requirements

### Requirement: Trusted administrator access

The system SHALL require a trusted ingress and authenticated expiring revocable administrator session for every management read or write, reject cross-origin mutations, persist login throttling and audit changes. Public storefront ingress SHALL deny management routes. Features SHALL be disabled by default. In production, only the normalized email wangperry666@gmail.com SHALL be accepted for administrator creation, password reset, login and existing-session authorization. Non-production isolated test administrators SHALL remain usable. Password creation/reset SHALL accept 12–256 characters and store only salted scrypt hashes. An optional private runtime bootstrap hash SHALL create the allowed administrator after migration, without replacing an existing password or storing plaintext in source, docs or logs.

#### Scenario: Public request spoofs administrator headers

- **WHEN** a public user attempts an admin page or API including forged headers
- **THEN** the public proxy removes the secret marker and access is denied without data disclosure

#### Scenario: Expired or revoked session mutates data

- **WHEN** an expired session or a cross-origin request submits a management mutation
- **THEN** no mutation occurs and the request is rejected

#### Scenario: Previously registered non-allowlisted administrator

- **WHEN** a different email has a valid stored password or an unexpired session in production
- **THEN** login and session authorization are rejected without deleting historical records

#### Scenario: Owner initial password

- **WHEN** the configured owner uses a valid 12-character password
- **THEN** creation and login succeed and only its salted hash is persisted

#### Scenario: Restart after owner password reset

- **WHEN** production initialization runs again with an old bootstrap hash
- **THEN** it preserves the existing owner password and does not reactivate previous sessions
