## ADDED Requirements

### Requirement: Supplement exact order searches with Shopify visit evidence

The authenticated Meta diagnostics order search SHALL use retained, signed Offy evidence first. When that evidence has no ad ID or no local order exists, an exact order-number search SHALL read the matching recent Shopify order and its recorded visitor journey using the existing order access. Period lists and funnel statistics SHALL remain based on local evidence. The lookup SHALL disclose the sales channel when provided, identify the source of the displayed ad ID, and distinguish missing data, conflicting IDs, an incomplete journey and an unavailable Shopify response. It SHALL exclude test orders by default and return only order facts and sanitized advertising evidence.

#### Scenario: Shop order with a recorded ad ID

- **WHEN** Shopify returns an exact recent Shop order with a complete visit history that identifies one Meta ad in paid traffic
- **THEN** the order lookup displays that ID as Shopify visit evidence, with no invented Offy checkout time or change to the funnel totals.

#### Scenario: Shop order without supporting evidence

- **WHEN** Shopify returns an exact recent Shop order without a distinguishable ad ID
- **THEN** the order lookup displays its sales channel and the available click evidence or unknown source, without assigning an ad or classifying the order as organic.

#### Scenario: Shopify is unavailable or returns multiple ad IDs

- **WHEN** the Shopify lookup fails, a visit history is incomplete, or it identifies multiple distinct paid Meta IDs
- **THEN** any signed local evidence stays visible and the administrator sees the relevant lookup status without a newly assigned ad ID.

#### Scenario: Orders with a local ad ID or a list request

- **WHEN** an exact search has a locally recorded ad ID or the administrator views a date-based list
- **THEN** the result is served from local evidence without a Shopify journey request.
