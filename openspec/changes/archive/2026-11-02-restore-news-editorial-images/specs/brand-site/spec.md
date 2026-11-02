## MODIFIED Requirements

### Requirement: News module

NEWS SHALL show The Latest from OFFY without News· or the retired NEW ARRIVALS badge. Product bindings, editorial copy and the five curated local editorial photographs SHALL remain site configuration. The feature SHALL use `news-01.jpg`; the secondary cards SHALL use `news-04.jpg`, `news-03.jpg`, `news-08.jpg` and `news-02.jpg` in their configured order. Shopify product images SHALL NOT replace these editorial assets or determine image availability. Cards SHALL still render only for Shopify-verified available products in the visitor market. Missing bindings SHALL be hidden rather than advertised as available products. Product prices, inventory, product-detail media and checkout SHALL remain Shopify-authoritative.

#### Scenario: News links

- **WHEN** a verified card is activated
- **THEN** it opens the configured Shopify product handle and the browse-all link stays outside the grid

#### Scenario: Curated editorial images

- **WHEN** the five bound products are verified as available, regardless of changes or omissions in their Shopify primary images
- **THEN** NEWS displays the five configured local editorial photographs in the existing layout and does not substitute Shopify product media
