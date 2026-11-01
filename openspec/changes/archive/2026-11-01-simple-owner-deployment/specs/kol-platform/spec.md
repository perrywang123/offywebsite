## ADDED Requirements

### Requirement: Single production owner configuration

Production SHALL allow only `wangperry666@gmail.com` to authenticate. A server-only repository configuration MAY contain that email and its salted scrypt password hash as explicitly authorized by the owner; it SHALL NOT contain the plaintext password or be shipped in public assets/client bundles. First startup SHALL initialize a missing owner from a private bootstrap override or this repository fallback. Existing owners and password resets SHALL be preserved. Session expiry, revocation, login throttling, trusted ingress, mutation Origin/CSRF and per-request email checks SHALL remain enforced.

#### Scenario: Clean production database

- **WHEN** migrations have run and no owner or private bootstrap hash exists
- **THEN** startup initializes the single allowed account from the repository server configuration without a manual account creation step

#### Scenario: Existing account

- **WHEN** the production owner already exists
- **THEN** startup preserves its password and sessions rather than resetting it from the repository fallback
