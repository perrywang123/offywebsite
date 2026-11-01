# kol-platform Specification

## Purpose

Define the optional single-shop KOL management, session attribution, Shopify accounting and manual settlement contract.

## Requirements

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

### Requirement: Versioned KOL cooperation

The system SHALL support stable unique aliases, required custom commission from 0 to 100 percent with at most two decimals, versioned terms and dates, pause/end state, contract/video references and immutable audits. New KOL links SHALL not require deployment.

#### Scenario: Rate changes after checkout

- **WHEN** an administrator changes a cooperation rate after a checkout was created
- **THEN** the existing checkout retains its original version and rate and future checkouts use the new valid terms

### Requirement: Session-only referral attribution

The system SHALL count filtered link requests and confirmed landings separately, expire site referral sessions after 30 idle minutes, snapshot each checkout for 30 minutes, and verify signed local reference plus Shopify cart association and actual successful payment time. Coupon usage SHALL neither create nor override attribution. Analytics failure SHALL not block shopping.

#### Scenario: Coupon from another KOL

- **WHEN** a valid Maya referral checkout uses Eli's coupon
- **THEN** verified commission belongs to Maya

#### Scenario: Return after expiry or replay

- **WHEN** an expired session, late payment or copied reference from a different cart attempts attribution
- **THEN** no automatic commission is approved and uncertain evidence is visible for review

#### Scenario: New tab or later referral

- **WHEN** another referral starts after an existing checkout was created
- **THEN** the previous checkout retains its frozen independent attribution

### Requirement: Shopify-authoritative coupon operations

The system SHALL bind verified existing Shopify codes and append a unique candidate to an eligible existing code-discount campaign through persisted asynchronous operations. Remote job result and code/campaign readback SHALL precede distribution. Rules SHALL remain Shopify-owned; code ownership SHALL be case-insensitively unique per shop and historical codes SHALL not be reassigned.

#### Scenario: Timeout after remote creation

- **WHEN** a creation response is lost or local binding fails after remote success
- **THEN** retry reconciles the same operation and candidate without creating an unrelated code or deleting the campaign

### Requirement: Verified financial ledger

The system SHALL use Shopify successful payment/refund transactions and discounted tax-exclusive merchandise in a consistent currency, exclude gift-card products, snapshot the rate, compute exact rounded target commission and append only its delta. Duplicated or unordered webhooks SHALL not duplicate balances; uncertain edits, transactions, taxes or disputes SHALL require review.

#### Scenario: Partial refund after settlement

- **WHEN** a successfully refunded merchandise amount lowers an already paid order commission
- **THEN** a negative ledger adjustment remains available for a future settlement and the historical paid ledger is preserved

### Requirement: Reconciled manual settlement

The system SHALL hold commissions for 30 days, create separate per-KOL/per-currency batches, reconcile orders before lock and payment, prevent repeated inclusion, export PII-free formula-safe CSV and record manual payments with audit. New changes after lock SHALL invalidate payment until reconciled.

#### Scenario: Concurrent settlement or payment

- **WHEN** two requests select the same ledger entries or record the same batch payment
- **THEN** only one active inclusion and one effective payment succeed

### Requirement: Durable Shopify synchronization

The system SHALL verify webhook raw-body HMAC and shop, persist minimal deduplicated inbox entries before acknowledgment, retry failed work with leases/backoff and incrementally reconcile paginated orders. Synchronization health and missing scopes SHALL be visible and stale/failed rechecks SHALL block affected settlement.

#### Scenario: Missing or delayed event

- **WHEN** a webhook is delayed, duplicated or omitted
- **THEN** actual payment time controls attribution, replay is idempotent and overlap-window reconciliation can recover the order

### Requirement: Isolated validation and deployment

The system SHALL provide separate public/admin ingress configuration, a shared persistent database, worker configuration and an isolated local integration environment. Test Shopify transport SHALL be restricted to explicit loopback integration mode and SHALL be unavailable in production.

#### Scenario: Full local purchase flow

- **WHEN** local integration testing creates a KOL, coupon, referral purchase, refund and settlement
- **THEN** it uses a separate test database and mock Shopify without production mutations

### Requirement: Single production owner configuration

Production SHALL allow only `wangperry666@gmail.com` to authenticate. A server-only repository configuration MAY contain that email and its salted scrypt password hash as explicitly authorized by the owner; it SHALL NOT contain the plaintext password or be shipped in public assets/client bundles. First startup SHALL initialize a missing owner from a private bootstrap override or this repository fallback. Existing owners and password resets SHALL be preserved. Session expiry, revocation, login throttling, trusted ingress, mutation Origin/CSRF and per-request email checks SHALL remain enforced.

#### Scenario: Clean production database

- **WHEN** migrations have run and no owner or private bootstrap hash exists
- **THEN** startup initializes the single allowed account from the repository server configuration without a manual account creation step

#### Scenario: Existing account

- **WHEN** the production owner already exists
- **THEN** startup preserves its password and sessions rather than resetting it from the repository fallback
