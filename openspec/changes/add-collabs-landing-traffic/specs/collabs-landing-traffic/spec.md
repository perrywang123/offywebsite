## ADDED Requirements

### Requirement: Independent consent-aware landing observations

The storefront SHALL asynchronously observe public Offy landing pages containing a known official dt_id only when the existing Shopify privacy API allows analytics. Missing or failed permission SHALL NOT grant permission. Observation SHALL NOT modify native Shopify analytics, navigation, products, checkout, attribution or payment behavior. Short-link redirects SHALL remain separate from landing views.

#### Scenario: Direct and short-link landings

- **WHEN** a consented browser lands directly on an Offy page with a known dt_id or reaches it through an Offy short link
- **THEN** the actual rendered landing contributes one PV, while the redirect request is not added as a second landing PV

#### Scenario: Consent unavailable or withdrawn

- **WHEN** analytics permission is unknown, denied or withdrawn
- **THEN** no new landing observation or visitor identifier is created, and withdrawal clears the existing identifier and requests removal of its UV membership

### Requirement: Idempotent bounded collection

The public collector SHALL enforce canonical same-origin requests, a small streamed body limit, explicit versioned fields and bounded rate limits. Known preview/bot and prefetch requests SHALL be excluded. Unknown or disabled tracking groups SHALL NOT create observations or cookies. Repeated view IDs SHALL NOT increment PV again, including after a retry. Input times, amounts and personal data SHALL NOT enter this contract. Storage failures SHALL be isolated from commerce.

#### Scenario: Replayed or forged collection request

- **WHEN** a duplicate view, foreign origin, unknown tracking group or invalid/oversized request is received
- **THEN** duplicate views remain single-counted and invalid requests create no visitor data

### Requirement: Anonymous browser membership and retention

The system SHALL use a purpose-signed first-party anonymous browser cookie with a fixed maximum 90-day lifetime and persist only a purpose-separated keyed hash for UV membership. Raw IP, full User-Agent, buyer identity and device fingerprints SHALL NOT be persisted. Event receipts and browser membership SHALL be pruned after 90 UTC days independently of Shopify Admin credentials. Withdrawal SHALL remove matching UV membership without fabricating negative PV or changing financial data.

#### Scenario: One browser visits on multiple days

- **WHEN** the same valid browser identifier generates multiple views and visits on different days within the selected period
- **THEN** all accepted unique views contribute to PV and the period UV counts the browser once rather than summing daily distinct counts

### Requirement: Explicit administrator traffic evidence

The authenticated workspace SHALL group Offy landing PV and distinct-browser UV by official dt_id for 7, 30 or 90 days, show UTC daily evidence and collection start, and disclose historical aliases sharing a group. It SHALL distinguish these from redirect requests, official Collabs Visits, sales, commissions and payments. Missing history SHALL remain identifiable even where the daily presentation displays zero. Shopify-only visits and cross-device identity SHALL NOT be claimed as observed Offy users.

#### Scenario: Legacy test aliases share a tracking ID

- **WHEN** several aliases point to the same dt_id
- **THEN** one combined landing group is displayed with its aliases, without multiplying PV or UV into separate creator totals

### Requirement: Public cooperation contact

Current KOL-facing content and Collabs contact configuration SHALL use contact@whimcoreofficial.com. Administrator authentication and existing creator account identities SHALL remain unchanged. Any required mailbox verification SHALL be completed by the owner and verified from the native UI; historical evidence SHALL not be rewritten as if it used the new address originally.

#### Scenario: Administrator or KOL reads cooperation instructions

- **WHEN** current cooperation contact details are displayed in Offy or the live SOPs
- **THEN** the public mailbox is shown while the existing administrator login continues to use its authorized identity
