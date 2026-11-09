## MODIFIED Requirements

### Requirement: Cart

The cart SHALL persist only local item identity and quantity in offy.cart.v1, merge duplicate adds and clamp quantities to 1–99. It SHALL preserve saved lines when verification fails, display a clear unavailable state, and restore line facts and totals only after Shopify verification. Confirmed missing or destination-ineligible identities SHALL remain until the shopper removes them; no unverified names, images or prices SHALL substitute for their facts. A cart with unresolved commercial facts SHALL NOT expose checkout or an apparently complete subtotal.

#### Scenario: Verification fails

- **WHEN** the product API is unavailable
- **THEN** saved lines remain in localStorage and the shopper sees a retry state instead of an empty bag

#### Scenario: Retry recovers

- **WHEN** verification succeeds after a failure
- **THEN** verified names, images, market prices and actionable checkout are restored

#### Scenario: Item missing in a new destination

- **WHEN** Shopify confirms no product for a saved identity in the new market
- **THEN** its identity/quantity remains removable and can recover after switching back; no complete subtotal or checkout is available until all remaining lines are verified and eligible
