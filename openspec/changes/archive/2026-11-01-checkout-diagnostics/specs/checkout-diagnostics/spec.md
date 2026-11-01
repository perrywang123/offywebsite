## ADDED Requirements

### Requirement: Anonymous checkout attempts

The application SHALL persist every received valid Shopify checkout attempt without requiring email or KOL attribution. The shared cart preparation SHALL register before client verification when the diagnostic endpoint is reachable. It SHALL correlate client observations using a high-entropy, expiring, single-checkout receipt and SHALL record direct checkout API calls without a receipt. Diagnostics failure SHALL NOT block commerce.

#### Scenario: Verification fails before checkout API

- **WHEN** a shopper clicks checkout and client catalog verification fails
- **THEN** the registered attempt retains requested items, country decision and a client-verification-failed observation without creating a Shopify cart

#### Scenario: Direct or repeated request

- **WHEN** checkout is requested without a valid unclaimed matching receipt
- **THEN** the server creates a separate attempt without overwriting another attempt

### Requirement: Diagnostic evidence and truthful stages

Records SHALL include bounded country-decision evidence, requested and server-resolved products, Shopify request parameters without credentials, HTTP status/request ID when available, cart results/userErrors/warnings, durations and generated redirect. Country selection, eligibility checks, KOL attribution and original redirect URLs SHALL retain their existing behavior. Client reports SHALL be distinguished from server facts. Generated redirects SHALL NOT be described as checkout arrival, completed orders or payment success.

#### Scenario: Shopify cart returns warnings

- **WHEN** cartCreate returns a checkout URL and warnings
- **THEN** diagnostics preserve the warnings and returned lines without adding a new checkout rejection rule

#### Scenario: Shopify fails

- **WHEN** HTTP, GraphQL or transport errors occur
- **THEN** the corresponding stage and sanitized error evidence remain recorded without exposing secrets in ordinary logs

### Requirement: Protected diagnostic review

The admin SHALL provide authenticated, trusted-ingress-only paginated filtering and attempt details with ordered events. Public diagnostic endpoints SHALL NOT disclose stored records or accept server-result mutations. Sensitive reveals SHALL require mutation origin/CSRF protection and SHALL be audited. Admin responses SHALL use private no-store caching.

#### Scenario: Anonymous reader

- **WHEN** an unauthenticated caller requests diagnostic details or a full link
- **THEN** access is denied without revealing the record

### Requirement: Sensitive data retention

Full checkout URLs, cart secret keys and complete Shopify responses SHALL be authenticated-encrypted at rest. Ordinary metadata and logs SHALL be redacted and SHALL exclude customer contact/address, raw IP, authorization and Cookie values. Metadata SHALL be retained for 30 days and sensitive payloads for 7 days, with automatic cleanup independent of KOL activation. Reading an expired payload SHALL never reveal it.

#### Scenario: Shared deployment and expiration

- **WHEN** storefront and admin share the configured SQLite volume
- **THEN** they share the persisted encryption key or configured override; expired sensitive payloads are unavailable even before periodic cleanup
