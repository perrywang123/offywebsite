## MODIFIED Requirements

### Requirement: Cart
The system SHALL keep a client-side cart of `{ code, quantity }` lines, persisted to localStorage. On load, the cart SHALL automatically prune lines whose product code no longer exists in the catalog (removing them from storage), so badge counts and rendered lines always agree. Quantity updates SHALL be clamped to 1-99 on the client, matching the server-side clamp.

#### Scenario: Duplicate add
- **WHEN** the same product is added twice
- **THEN** its quantity increments rather than creating a duplicate line

#### Scenario: Stale lines are pruned on load
- **WHEN** localStorage contains a line whose code is not in the catalog
- **THEN** the line is removed from storage and never counted in badges or totals

#### Scenario: Quantity clamp
- **WHEN** the user increments quantity beyond 99
- **THEN** the value is clamped to 99 on the client, matching server behavior

### Requirement: Payment abstraction (reserved)
The system SHALL keep the payment boundary behind a provider abstraction so additional providers can be added without changing the checkout UI. The checkout UI and the checkout API SHALL agree on provider identifiers: the UI submits `stripe` (not `card`) for card payments, and the API validates the same enum.

#### Scenario: Add a provider
- **WHEN** a new payment provider is registered
- **THEN** the checkout flow can use it without changes to the UI contract

#### Scenario: Card payment routes to Stripe
- **WHEN** the buyer selects card payment and submits
- **THEN** the API accepts the request and routes it to the Stripe provider (no 400)

## ADDED Requirements

### Requirement: Order confirmation requires a high-entropy credential
The checkout success page SHALL look up orders only by a high-entropy credential —
the Stripe `session_id` or the PayPal order id — never by the enumerable order
number (`OF-YYYY-NNNNNN`). Requests carrying only an order number SHALL NOT
return order details.

#### Scenario: Stripe success via session_id
- **WHEN** the buyer returns from Stripe with `?session_id=...`
- **THEN** the page resolves the order through the session record and displays it

#### Scenario: Enumerable order number rejected
- **WHEN** a request carries only `?order_id=OF-2026-000001`
- **THEN** the page does not render any customer PII or order details

### Requirement: Product detail shows Shopify description
The product detail page SHALL render the product description (enriched from
Shopify) under a 「关于这款形象」 heading, hidden when the description is empty.

#### Scenario: Description renders
- **WHEN** a product has a non-empty description
- **THEN** it appears on the detail page in the current locale (zh falls back to en text until Shopify translations exist)
