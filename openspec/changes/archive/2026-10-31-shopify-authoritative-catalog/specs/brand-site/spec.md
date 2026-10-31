## ADDED Requirements

### Requirement: Brand-preserving commerce outage presentation

The storefront SHALL retain independently available brand content and its navigation when Shopify commercial data fails. Product-specific editorial cards and product modules SHALL not present unverified commercial content. The homepage SHALL consolidate affected commerce modules into one clear local unavailable presentation. Healthy independently loaded modules SHALL remain visible.

#### Scenario: Homepage commerce outage

- **WHEN** Shopify product data is unavailable
- **THEN** the brand hero, story and support remain reachable, while affected product sections are replaced by a retry presentation

### Requirement: Outage indexing protection

Unavailable commerce HTML SHALL be excluded from indexing and SHALL emit no Product Offer or fabricated product count. Confirmed product absence SHALL retain its separate not-found behavior. Sitemap generation SHALL never substitute the local catalog after upstream failure or publish a failed partial product enumeration as complete.

#### Scenario: Detail outage has no false product offer

- **WHEN** a detail unavailable state is rendered
- **THEN** it carries noindex and no Product/Offer JSON-LD

## MODIFIED Requirements

### Requirement: News module

NEWS SHALL show The Latest from OFFY without News· or the retired NEW ARRIVALS badge. Product bindings and editorial copy remain site configuration. Cards SHALL render only for Shopify-verified available products in the visitor market, using that product's returned image. Missing bindings SHALL be hidden rather than advertised as available products.

#### Scenario: News links

- **WHEN** a verified card is activated
- **THEN** it opens the configured Shopify product handle and the browse-all link stays outside the grid

### Requirement: Regional-exclusive presentation

Regionals SHALL be inferred only after all configured probe countries return complete successful Storefront rosters, with at least two countries and the visitor inside the probe scope. Probe scope and target whitelist remain independent. Failed probes SHALL hide uncertain inferences. Merch SHALL be excluded from the homepage; regional display prices SHALL reuse the verified visitor-market catalog.

#### Scenario: Non-target visitor

- **WHEN** the visitor is outside the target whitelist or any required probe fails
- **THEN** no regional-exclusive section is rendered

### Requirement: Series and catalog presentation

Catalog and series pages SHALL render current Shopify names and product facts with sticky category navigation when those data are available. Site slugs, hero assets and taglines remain configuration; local series titles SHALL NOT replace failed or removed Shopify collections. Overview cards retain the whole-series editorial photos. Unavailable data SHALL show the approved recovery presentation.

#### Scenario: Series identity

- **WHEN** outdoor-sporty or playful-life successfully renders
- **THEN** its image shows the streetwear/sport or dress-up group respectively, with the Shopify collection title
