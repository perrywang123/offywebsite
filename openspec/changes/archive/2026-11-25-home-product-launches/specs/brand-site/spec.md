## ADDED Requirements

### Requirement: Configure Coming Soon cards

Operators SHALL be able to enable Coming Soon for the feature or any secondary card in the existing Latest editor. A preview SHALL link to a Shopify product on the same storefront and use the configured image. When an operator first publishes a preview for a destination, the editor SHALL require the product to be readable through the Storefront API and have `custom.coming_soon` enabled. The storefront SHALL read the current `custom.release_date` value without storing a copy in home configuration. Previously saved cards SHALL continue to work without this option.

#### Scenario: Upcoming card

- **WHEN** Coming Soon is enabled for a card and Shopify confirms its product is still awaiting release in the visitor's market
- **THEN** the card shows Coming Soon and time remaining or an unannounced or waiting state, and the whole card links to the ordinary product details path

#### Scenario: Released card and ordinary cards

- **WHEN** the product has released, the card has no preview enabled, or the preview cannot be verified in the visitor's market
- **THEN** the configured image and link remain in the existing grid without an unverified countdown
