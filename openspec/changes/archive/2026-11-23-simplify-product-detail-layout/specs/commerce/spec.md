## MODIFIED Requirements

### Requirement: Product overview and detail photography

The product detail page SHALL show the product name, with its market price or upcoming status, after the original Shopify gallery on narrow screens. The series link SHALL remain in the breadcrumbs when a series page exists, and the heading area SHALL omit the repeated series label. The page SHALL group all available Shopify description paragraphs after the gift and styling information, with compact spacing and without a separate heading or disclosure control. Verified size and materials guides SHALL follow in the product information column, retain their full aspect ratio and open in a dialog operable by touch and keyboard. The separate close-up section SHALL be hidden while its design is under review. The original Shopify gallery and series grid SHALL keep every previously accessible picture and product respectively.

#### Scenario: Shopify provides a longer product description

- **WHEN** the product has an introduction and additional description content
- **THEN** the page shows each description paragraph once in its original order in one visible group
- **AND** the group has no Full description title or collapse control

#### Scenario: A product belongs to a series

- **WHEN** the product belongs to a series with a collection page
- **THEN** the breadcrumb links to the series and the product name has no duplicate series label above it

#### Scenario: Details and guide images are available

- **WHEN** the selected product has verified close-ups and original size or materials guides
- **THEN** the page shows the available guides directly below the description and before the buyer photo and same-series sections
- **AND** The little details section is absent

#### Scenario: Optional editorial media cannot be verified

- **WHEN** the guide sources are empty or unavailable, even if close-ups exist
- **THEN** the supplementary photo section is omitted while the overview, original gallery and purchase actions remain usable

### Requirement: Verified product gift offers

The product detail page SHALL present only selected active Shopify automatic buy-X-get-Y discounts with a verified quantity requirement, a qualifying current product or variant, an unrestricted audience and an available reward in the current Storefront market. The gift heading and contents SHALL appear together without a collapse control. An unavailable rule, unsupported condition, missing access or unavailable reward SHALL suppress its tier. The gift section SHALL be omitted when no tier qualifies. Gift information SHALL be independent of checkout session creation and leave price, order and stacking decisions to Shopify.

#### Scenario: Current product qualifies for an active gift

- **WHEN** the Shopify rule verifies the current product and the selected market has a matching available reward
- **THEN** the product page shows the title, tier name, image, required quantity and gift note on arrival without a collapse control
- **AND** each gift photo covers a 3:4 frame without side gutters

#### Scenario: The English gift disclosure uses the default copy

- **WHEN** the verified offers include a one-item threshold and the campaign has no custom terms
- **THEN** the one-item tier shows Buy Any OFFY and the gift note reads All eligible gifts are automatically included.
- **AND** any higher tier displays its Shopify quantity

#### Scenario: A gift is inactive or unverified

- **WHEN** Shopify reports that the rule is inactive, context restricted, not applicable, or its rule or reward data cannot be verified
- **THEN** the product page omits that tier and remains usable with or without other offers
