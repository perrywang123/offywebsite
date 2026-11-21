## ADDED Requirements

### Requirement: Product overview and detail photography

The product detail page SHALL surface the first Shopify description paragraph next to its product heading and purchase actions and make the rest available in a native disclosure. It SHALL show close-ups and original size and materials guides when the current product has verified Shopify media. Guide pictures SHALL retain their full aspect ratio and open in a dialog operable by touch and keyboard. The original Shopify gallery and series grid SHALL keep every previously accessible picture and product respectively.

#### Scenario: Details and guide images are available

- **WHEN** the selected product has verified detail or guide media
- **THEN** the page shows those images before the buyer photo and same-series sections, and guide contents are presented visually by the images

#### Scenario: Optional editorial media cannot be verified

- **WHEN** the detail or guide sources are empty or unavailable
- **THEN** the page omits the corresponding content and preserves the successfully loaded overview, original gallery and purchase actions

### Requirement: Verified product gift offers

The product detail page SHALL present only selected active Shopify automatic buy-X-get-Y discounts with a verified quantity requirement, a qualifying current product or variant, an unrestricted audience and an available reward in the current Storefront market. The disclosure SHALL start open and be collapsible. An unavailable rule, unsupported condition, missing access or unavailable reward SHALL suppress its tier. The disclosure SHALL be omitted when no tier qualifies. Gift information SHALL be independent of checkout session creation and leave price, order and stacking decisions to Shopify.

#### Scenario: Current product qualifies for an active gift

- **WHEN** the Shopify rule verifies the current product and the selected market has a matching available reward
- **THEN** the product page shows the tier name, image, required quantity and redemption guidance on arrival

#### Scenario: A gift is inactive or unverified

- **WHEN** Shopify reports that the rule is inactive, context restricted, not applicable, or its rule or reward data cannot be verified
- **THEN** the product page omits that tier and remains usable with or without other offers
