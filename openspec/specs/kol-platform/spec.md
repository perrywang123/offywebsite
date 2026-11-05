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

The system SHALL support stable unique aliases, required custom commission from 0 to 100 percent with at most two decimals, versioned terms and dates, pause/end state, contract/video references and immutable audits. New KOL links SHALL not require deployment. The management form SHALL require only one KOL name input and generate a unique reserved referral alias on the server, including duplicate and non-Latin names; editing a name SHALL preserve the existing alias and past attribution. Explicit aliases from existing API clients SHALL remain supported and immutable. Social profile URLs SHALL be optional, and non-empty values SHALL be valid HTTPS URLs. The form SHALL distinguish the generated referral link from its shopping destination, offer existing home/products destinations and preserve valid legacy destinations on edit. Failed validation SHALL show actionable field-specific reasons rather than only a generic failure.

#### Scenario: Rate changes after checkout

- **WHEN** an administrator changes a cooperation rate after a checkout was created
- **THEN** the existing checkout retains its original version and rate and future checkouts use the new valid terms

#### Scenario: Create without alias or social profile

- **WHEN** an administrator provides a KOL name and valid cooperation terms without an alias or social profile URL
- **THEN** creation succeeds with a unique fixed referral alias and an empty profile, including when another KOL has the same name

#### Scenario: Rename an existing cooperation

- **WHEN** an administrator changes the name or terms of an existing KOL without supplying a new alias
- **THEN** the original referral link remains unchanged and the new terms are versioned

#### Scenario: Invalid shopping destination

- **WHEN** a client submits `/maya` as a destination or an invalid non-empty profile URL
- **THEN** no cooperation is created and the administrator can identify the failing field and how to correct it

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

### Requirement: Persistent management navigation

The management console SHALL use client-side navigation inside a persistent shared administrator layout. After initial authentication/data loading, switching valid sections SHALL preserve the navigation and existing local snapshot, refresh data in the background and keep partner, coupon, order and settlement filters independent. Direct section URLs and browser history SHALL remain supported, and unknown sections SHALL remain not found. Section changes SHALL close temporary dialogs. Failed background reads SHALL preserve the last data with an explicit stale-data warning; unauthorized responses SHALL clear it and return to login. Aborted or superseded reads SHALL not replace newer data or authorization state. Existing trusted-ingress checks and server-side authentication of every management API SHALL remain enforced. Checkout diagnostics SHALL retain their URL-based filtering and MAY show a section-local loading state without replacing the management frame.

#### Scenario: Switch between sections

- **WHEN** an authenticated administrator switches from partners to orders or another valid section
- **THEN** the same management frame remains mounted, the full-page connecting screen does not reappear and existing data remains visible while a fresh snapshot is requested

#### Scenario: Filters and history

- **WHEN** an administrator applies a partner search, switches to orders and returns using navigation or browser history
- **THEN** order filters remain independent and the partner search is restored

#### Scenario: Background read fails or session expires

- **WHEN** a background read fails with a transient error or returns unauthorized
- **THEN** a transient error keeps the prior snapshot with a clear warning, while unauthorized access clears the snapshot and shows login

### Requirement: Consistent administrator workspace usability

The five management sections SHALL use visible associated labels, consistent readable controls, responsive content boundaries and keyboard-accessible actions. Active filters SHALL offer a current-section reset; invalid date ranges SHALL identify the error rather than appear as a legitimate empty result. Empty datasets and zero search matches SHALL have distinct actionable states. Modal forms SHALL keep the header, scrollable body and normal-flow action footer separate so fields and submit actions do not overlap on mobile; native validation, Escape and focus restoration SHALL remain available. Confirmation of consequential operations SHALL show the existing target identity and applicable amount/currency without changing financial authorization or business rules. Narrow-screen records SHALL retain field labels, amounts and actions, and any necessary horizontal scrolling SHALL be contained and identified rather than overflowing the whole page. Layout refinements SHALL preserve Shopify authority, currency separation, immutable history, session-only attribution, optional Admin connectivity and persistent navigation.

#### Scenario: Order filters on desktop and mobile

- **WHEN** an administrator filters orders using KOL, currency, status and payment dates
- **THEN** every control has a visible label and consistent sizing, invalid date order is explained and the current filters can be cleared

#### Scenario: Search finds no coupon or settlement

- **WHEN** existing data is filtered to zero matches
- **THEN** the section shows an explicit no-match explanation and a reset action rather than only empty table headers

#### Scenario: Mobile cooperation or financial confirmation

- **WHEN** an administrator scrolls a modal form or confirms a consequential action on a narrow viewport
- **THEN** all fields and the full action button remain reachable without footer overlap and the relevant target is visible before submitting

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
