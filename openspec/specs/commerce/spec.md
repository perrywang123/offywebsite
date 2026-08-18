# Commerce Specification

## Purpose
Sell Offy products (one SKU per look) with a Casetify-style "pick a look → add to bag → checkout" flow and Stripe payment (test mode, USD). Full inventory / admin / CMS remain future milestones.

## Requirements

### Requirement: Product catalog
The system SHALL expose a catalog of products with code, bilingual name, price (USD cents), series, dimensions, emotion tags, and images, served from a single static data source (`src/lib/catalog`).

#### Scenario: List products
- **WHEN** a client requests the catalog
- **THEN** every sellable product is returned with a positive integer price and at least one image

### Requirement: Product detail
The system SHALL render a detail page per product code with image, name, price, dimensions, and sibling-look selection.

#### Scenario: Unknown code
- **WHEN** a product code does not exist
- **THEN** the API returns 404 and the page returns not-found

### Requirement: Cart
The system SHALL keep a client-side cart of `{ code, quantity }` lines, persisted to localStorage.

#### Scenario: Duplicate add
- **WHEN** the same product is added twice
- **THEN** its quantity increments rather than creating a duplicate line

### Requirement: Checkout session (server-authoritative pricing)
The system SHALL create a Stripe Checkout Session with prices taken exclusively from the server-side catalog, ignoring any client-supplied price.

#### Scenario: Missing Stripe key
- **WHEN** no Stripe secret key is configured
- **THEN** checkout returns HTTP 503 without throwing

### Requirement: Order capture via webhook
The system SHALL persist an order only after a verified `checkout.session.completed` webhook, idempotently.

#### Scenario: Repeated webhook event
- **WHEN** the same event is delivered twice
- **THEN** only one order is written

### Requirement: Payment abstraction (reserved)
The system SHALL keep the payment boundary behind `src/server/checkout` so additional providers can be added. (Reserved — Stripe only today.)

### Requirement: Inventory & order management (reserved)
The system SHALL support stock levels and a merchant order dashboard in a future milestone. (Reserved — not yet implemented.)
