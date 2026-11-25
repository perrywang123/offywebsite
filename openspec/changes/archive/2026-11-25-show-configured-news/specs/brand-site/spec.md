## MODIFIED Requirements

### Requirement: Homepage renders brand content

The homepage SHALL render the enabled Hero → NEWS → Shop by Category (FEATURED, separate applicable REGIONAL EXCLUSIVE, then All Products circular thumbnails) → bag-charm teaser → collaboration → newsletter → upcoming IPs. The All Products roster SHALL enumerate the verified current-market non-merch catalog, independently of the six-item recommendation limit. The removed homepage Marquee SHALL NOT render; the shared Header promo bar SHALL display the enabled announcements. Collaboration SHALL link to /policies/contact, and active copy SHALL not use the retired playcoretoys.com contact. The original three series memberships, routes and ordering SHALL remain independent of homepage curation.

#### Scenario: Product and brand sections

- **WHEN** the homepage loads normally
- **THEN** the stated sections render in order, with the All Products thumbnail roster after regionals and no replacement three-series link strip or homepage Marquee

#### Scenario: Independent roster availability

- **WHEN** recommendations are unavailable but the current-market full catalog is verified
- **THEN** the All Products roster remains available; if its own read fails it is withheld without fabricated or stale products

### Requirement: News module

NEWS SHALL show The Latest from OFFY without News· or the retired NEW ARRIVALS badge. The feature and all four secondary cards SHALL use the published images and destinations in their configured order. The Browse All Series destination SHALL use published homepage settings. By default the feature uses the owner-provided `news-swan-queen.jpg` photograph and links to `swan-princess`; the secondary cards use `news-04.jpg`, `news-03.jpg`, `news-08.jpg` and `news-02.jpg` in that order. The homepage feature SHALL omit the visible ROMANTICIZING EVERYDAY LIFE headline while retaining a horizontally centered, compact VIEW DETAILS capsule placed clear of the photograph's Limited 60 artwork. Feature alternative text SHALL prefer the configuration, then the Shopify product name if present, then the section title. Editorial cards SHALL render regardless of Shopify availability, missing products, or a catalog read failure. The editor SHALL ask operators to open the destinations and check that they are accessible before publishing. Product prices, inventory, product-detail media and checkout SHALL remain Shopify-authoritative.

#### Scenario: News links

- **WHEN** a card is activated
- **THEN** it opens the configured destination and the browse-all link stays outside the grid

#### Scenario: Curated editorial images

- **WHEN** Shopify primary images change or are absent
- **THEN** NEWS displays the five configured editorial photographs in the existing layout

#### Scenario: Swan Queen feature without headline

- **WHEN** the default homepage feature is configured and its product name is available
- **THEN** its provided SWAN QUEEN photograph and VIEW DETAILS link open `/products/swan-princess`, the old headline is absent, and the image alternative text identifies the product

#### Scenario: Feature binding unavailable

- **WHEN** the feature, ACE, or another linked product is missing or unavailable in the visitor's market, or the catalog cannot be read
- **THEN** the configured feature and all four secondary cards remain visible with their configured links
- **AND** Shopify product listings and checkout continue to use the live catalog

#### Scenario: Compact centered feature CTA

- **WHEN** the NEWS feature renders on narrow and desktop screens
- **THEN** VIEW DETAILS is horizontally centered within its card, remains legible, avoids the Limited 60 artwork, and retains the whole-card product link
