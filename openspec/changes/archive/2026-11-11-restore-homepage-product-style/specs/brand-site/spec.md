## MODIFIED Requirements

### Requirement: Homepage renders brand content

The homepage SHALL render Hero → NEWS → Shop by Category (FEATURED, separate applicable REGIONAL EXCLUSIVE, then All Products circular thumbnails) → bag-charm teaser → collaboration → newsletter → upcoming IPs. The All Products roster SHALL enumerate the verified current-market non-merch catalog, independently of the six-item recommendation limit. The removed homepage Marquee SHALL NOT render; the Header promo bar SHALL remain. Collaboration SHALL link to /policies/contact, and active copy SHALL not use the retired playcoretoys.com contact. The original three series memberships, routes and ordering SHALL remain independent of homepage curation.

#### Scenario: Product and brand sections

- **WHEN** the homepage loads normally
- **THEN** the stated sections render in order, with the All Products thumbnail roster after regionals and no replacement three-series link strip or homepage Marquee

#### Scenario: Independent roster availability

- **WHEN** recommendations are unavailable but the current-market full catalog is verified
- **THEN** the All Products roster remains available; if its own read fails it is withheld without fabricated or stale products

### Requirement: Separate and bounded homepage presentation

Main looks and regional cards SHALL have disjoint product identities. Regional cards SHALL appear only for the applicable destination, with no single-country claim inferred from multiple-country visibility. Incomplete required visibility probes SHALL make homepage recommendations unavailable, not imply absence of regionals. Both sections SHALL retain the original shared ProductCard photography (4:5 cover media), visible names/market prices, regional badge, container-site width, desktop three-column/mobile two-column grid and original spacing. The main title SHALL read FEATURED for both curated and time-based selection. REGIONAL EXCLUSIVE SHALL align above its grid and use the same heading size, weight and level as FEATURED, without a compact sidebar layout. All Products SHALL retain circular current-market thumbnails and accessible product links. Empty/error behavior SHALL preserve independently verified editorial content and roster. Original series pages and checkout SHALL remain unchanged.

#### Scenario: Regional classification fails

- **WHEN** a required country visibility read is incomplete
- **THEN** recommendations are withheld with retry presentation rather than allowing an unclassified exclusive into the main recommendation grid

#### Scenario: Original visual style and fixed section labels

- **WHEN** curated or fallback recommendations render
- **THEN** FEATURED and REGIONAL EXCLUSIVE share heading typography, photography uses the original product-card grid, and All Products displays the verified non-merch catalog without a six-item limit

#### Scenario: Responsive product comparison

- **WHEN** the module is viewed at 320/375px, 768px, 1440px or a wide desktop
- **THEN** names, market prices, circular thumbnails and navigation remain readable without page horizontal overflow

### Requirement: Shopify-curated homepage selection

The homepage SHALL prefer the Shopify collection `featured` in its merchant-defined collection order and current visitor market. It SHALL show at most six distinct available non-merch products belonging to the existing three series, excluding all verified current-market regional identities. It SHALL NOT re-sort curated candidates by creation time. A successfully empty or fully excluded collection SHALL remain an empty recommendation state. If the curated collection is missing or cannot be read, the homepage SHALL use the original two-newest-created-per-series live Shopify selection, excluding regionals before applying each series limit. A fallback read failure SHALL retain the commerce unavailable presentation without local product facts.

#### Scenario: Curated ordering and substitutions

- **WHEN** the merchant orders available, unavailable, repeated and regional candidates in featured
- **THEN** the homepage preserves the relative order of eligible unique candidates, continuing within that collection up to six without changing original series pages

#### Scenario: Collection not configured yet

- **WHEN** featured is absent or its read fails but the existing series and regional classification succeed
- **THEN** FEATURED uses current Shopify creation times, two per series, with regional identities excluded before taking limits

#### Scenario: Genuine empty curation

- **WHEN** featured is read successfully but has no eligible products
- **THEN** the homepage shows a deliberate empty state and catalog navigation without silently replacing the merchant selection
