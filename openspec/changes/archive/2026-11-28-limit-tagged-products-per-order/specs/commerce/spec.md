## ADDED Requirements

### Requirement: Shopify product limit per order

The storefront SHALL enforce a one-unit limit per Shopify product per order when the product has the `limit-1-per-order` tag in Shopify Storefront. The merchant's Shopify checkout rules SHALL remain responsible for limits that depend on buyer identity or previous orders.

#### Scenario: A tagged product is viewed or added to the bag

- **WHEN** the live Shopify product has the limit tag
- **THEN** the product detail and any corresponding bag line show the one-unit limit
- **AND** the shopper may add one available unit and cannot increase it beyond the limit
- **AND** the existing availability and release rules govern whether purchasing is possible

#### Scenario: A saved bag already exceeds the limit

- **WHEN** a bag contains more than one unit of a tagged product
- **THEN** the shopper can reduce the quantity or remove the line without losing the rest of the bag
- **AND** the bag explains what to change before checkout

#### Scenario: The server receives an excessive quantity

- **WHEN** the requested lines total more than one unit of the same tagged Shopify product, including repeated lines or different variants of that product
- **THEN** checkout preparation SHALL identify the affected lines and SHALL NOT create a Shopify cart or return a checkout redirect

#### Scenario: One tagged unit or an untagged product is submitted

- **WHEN** the requested quantities satisfy each tagged product's limit and all existing checkout checks pass
- **THEN** the storefront SHALL prepare the original checkout lines and permit the existing hosted guest checkout flow
