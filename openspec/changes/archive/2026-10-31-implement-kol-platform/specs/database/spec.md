## MODIFIED Requirements

### Requirement: Persistence scope

Tables SHALL contain newsletter subscribers, legacy checkout sessions, legacy orders and order items. Payment records SHALL store provider, currency and line/shipping snapshots as defined by the schema. The optional KOL platform SHALL use separate kol_* tables for administrators, sessions, versioned cooperation, referral/checkout evidence, coupon jobs, webhook inbox, Shopify accounting snapshots, immutable commission deltas, settlement snapshots, audits and synchronization state. Shopify KOL accounting SHALL NOT insert hosted orders into legacy orders.

#### Scenario: Shopify hosted order

- **WHEN** a shopper pays on Shopify and the optional KOL platform receives a verified event
- **THEN** durable reconciliation records the necessary Shopify accounting evidence in kol_shop_orders without modifying legacy orders

#### Scenario: Paid statement after refund

- **WHEN** a refund changes the live order after a settlement was paid
- **THEN** the stored settlement-item snapshot preserves the original statement and a separate ledger delta represents the adjustment
