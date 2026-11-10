## MODIFIED Requirements

### Requirement: Homepage renders brand content

The homepage SHALL render Hero → NEWS → homepage looks (curated Featured Looks or live fallback New Looks, separate applicable regionals and three series navigation) → bag-charm teaser → collaboration → newsletter → upcoming IPs. The dense circular product roster and removed homepage Marquee SHALL NOT render; the Header promo bar SHALL remain. Collaboration SHALL link to /policies/contact, and active copy SHALL not use the retired playcoretoys.com contact. The original three series memberships, routes and ordering SHALL remain independent of homepage curation.

#### Scenario: Product and brand sections

- **WHEN** the homepage loads normally
- **THEN** the sections appear in the stated order, with no repeated standalone product roster or homepage Marquee

## ADDED Requirements

### Requirement: Shopify-curated homepage selection

The homepage SHALL prefer the Shopify collection `home-featured` in its merchant-defined collection order and current visitor market. It SHALL show at most six distinct available non-merch products belonging to the existing three series, excluding all verified current-market regional identities. It SHALL NOT re-sort curated candidates by creation time. A successfully empty or fully excluded collection SHALL remain an empty recommendation state. If the curated collection is missing or cannot be read, the homepage SHALL use the original two-newest-created-per-series live Shopify selection, excluding regionals before applying each series limit. A fallback read failure SHALL retain the commerce unavailable presentation without local product facts.

#### Scenario: Curated ordering and substitutions

- **WHEN** the merchant orders available, unavailable, repeated and regional candidates in home-featured
- **THEN** the homepage preserves the relative order of eligible unique candidates, continuing within that collection up to six without changing original series pages

#### Scenario: Collection not configured yet

- **WHEN** home-featured is absent or its read fails but the existing series and regional classification succeed
- **THEN** New Looks uses current Shopify creation times, two per series, with regional identities excluded before taking limits

#### Scenario: Genuine empty curation

- **WHEN** home-featured is read successfully but has no eligible products
- **THEN** the homepage shows a deliberate empty state and catalog navigation without silently replacing the merchant selection

### Requirement: Separate and bounded homepage presentation

Main looks and regional cards SHALL have disjoint product identities. Regional cards SHALL appear only for the applicable destination, with no single-country claim inferred from multiple-country visibility. Incomplete required visibility probes SHALL make homepage merchandising unavailable, not imply absence of regionals. Main cards SHALL use Shopify images on a consistent square contain canvas, visible names/prices, a bounded desktop three-column/two-column mobile grid, keyboard focus and reduced-motion behavior. Compact regional layouts SHALL keep single cards bounded. Series navigation SHALL link to the three existing series without adding home-featured as a fourth series. Empty/error behavior SHALL preserve independently verified editorial content.

#### Scenario: Regional classification fails

- **WHEN** a required country visibility read is incomplete
- **THEN** recommendations are withheld with retry presentation rather than allowing an unclassified exclusive into the main recommendation grid

#### Scenario: Responsive product comparison

- **WHEN** the module is viewed at 320/375px, 768px, 1440px or a wide desktop
- **THEN** image bounds, names, market prices and navigation remain readable without horizontal overflow or oversized single regional cards
