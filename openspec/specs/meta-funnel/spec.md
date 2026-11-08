# meta-funnel Specification

## Purpose

Define optional consent-aware Meta storefront events, bounded server delivery and authenticated diagnostics while preserving Shopify checkout and its ownership of Purchase reporting.

## Requirements

### Requirement: Consented storefront funnel

The storefront SHALL optionally send PageView, ViewContent, AddToCart and InitiateCheckout to one configured Meta Pixel, independently of Collabs. It SHALL honor Shopify analytics, marketing and data sharing permissions and GPC, fail closed while consent is unknown, avoid replaying pre-consent shopping actions, and stop after withdrawal.

#### Scenario: Consent denied

- **WHEN** marketing consent is absent or revoked
- **THEN** no Meta script, event, marketing cookie or CAPI payload is created for that action.

#### Scenario: Verified commercial values

- **WHEN** an event describes products
- **THEN** it uses current Shopify-derived values and currency; missing prices or mixed currencies omit monetary data, and no unverified catalog ID mapping is invented.

### Requirement: Durable critical event delivery

The service SHALL queue only AddToCart and InitiateCheckout for CAPI, use the browser event ID and name for deduplication, encrypt matching identifiers at rest, enforce same-origin bounded ingestion, and keep tokens server-only. A bounded worker SHALL claim jobs with a lease, use finite retries/backoff and never execute commerce operations.

#### Scenario: Retry and duplicate delivery

- **WHEN** ingestion repeats or delivery encounters a transient failure
- **THEN** only one outbox job exists per event ID, and retries retain the original ID and timestamp.

### Requirement: Diagnosis without invented attribution

Authenticated administrators behind the existing ingress SHALL see redacted local event delivery, source and checkout associations. Accepted CAPI requests SHALL not be labeled ad-attributed purchases. Purchase SHALL remain owned by the existing Shopify integration and SHALL not be emitted by Offy browser return pages or this CAPI worker.

#### Scenario: Checkout succeeds while tracking fails

- **WHEN** the event store or external transport fails
- **THEN** checkout retains its existing result, market and redirect; diagnosis may be missing but payment is not blocked.
