# Database Specification

## Purpose

Define the implemented SQLite persistence contract, baseline 2026-10-31.

## Requirements

### Requirement: SQLite data access

The application SHALL use better-sqlite3 with Drizzle sqlite-core schema, WAL and foreign keys. Schema SHALL be centralized in src/server/db/schema.ts and access in client.ts. A non-sqlite provider currently SHALL fail explicitly rather than pretend PostgreSQL is implemented.

#### Scenario: PostgreSQL is selected

- **WHEN** DATABASE_PROVIDER is postgres
- **THEN** the current client throws a not-wired-up error; a separate migration project is required

### Requirement: Persistence scope

Tables SHALL contain newsletter subscribers, legacy checkout sessions, legacy orders and order items. Payment records SHALL store provider, currency and line/shipping snapshots as defined by the schema. The optional KOL platform SHALL use separate kol_* tables for administrators, sessions, versioned cooperation, referral/checkout evidence, coupon jobs, webhook inbox, Shopify accounting snapshots, immutable commission deltas, settlement snapshots, audits and synchronization state. Shopify KOL accounting SHALL NOT insert hosted orders into legacy orders.

#### Scenario: Shopify hosted order

- **WHEN** a shopper pays on Shopify and the optional KOL platform receives a verified event
- **THEN** durable reconciliation records the necessary Shopify accounting evidence in kol_shop_orders without modifying legacy orders

#### Scenario: Paid statement after refund

- **WHEN** a refund changes the live order after a settlement was paid
- **THEN** the stored settlement-item snapshot preserves the original statement and a separate ledger delta represents the adjustment

### Requirement: Versioned migrations

SQLite changes SHALL use committed db/migrations and the plain Node migration runner. Tests SHALL use in-memory SQLite without depending on customer database contents. PostgreSQL schema, migrations and asynchronous service compatibility are reserved and unimplemented.

#### Scenario: Application startup

- **WHEN** the Docker entrypoint runs
- **THEN** it applies SQLite migrations before executing the standalone server
