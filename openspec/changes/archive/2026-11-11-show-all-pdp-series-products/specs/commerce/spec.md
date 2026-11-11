## ADDED Requirements

### Requirement: Complete same-series recommendations

The product detail More from this series section SHALL render every other product returned by the successful complete Shopify series query for the selected visitor market, without a six-product display cap. It SHALL exclude the current product, preserve Shopify response order and the existing responsive grid, and keep merch recommendations separate from the three doll series. Product facts SHALL remain Shopify-authoritative; the existing gallery and purchase controls SHALL remain unchanged.

#### Scenario: Series exceeds six other products

- **WHEN** Shopify returns more than six other products in the current series and market
- **THEN** all of them appear once in the recommendation grid, in response order, including those beyond the former sixth position

#### Scenario: Current product or no other products

- **WHEN** the series response includes the current product
- **THEN** it is excluded from the recommendation cards; if no other products remain, the recommendation section is omitted

#### Scenario: Recommendation read fails

- **WHEN** the corresponding Shopify series read fails
- **THEN** the page keeps the verified main product and omits unverified recommendations without a local product fallback
