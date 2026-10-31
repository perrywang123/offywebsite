## MODIFIED Requirements

### Requirement: Product detail

The system SHALL render a detail page per product code with image, name, price, dimensions, and sibling-look selection. The page SHALL also expose a persistently reachable purchase action at 375×812 without requiring the visitor to scroll past the fold. The gallery SHALL present every image returned for the product, allowing the visitor to switch the main image; sibling products of the same series SHALL remain reachable — and each SHALL carry a visible product name — through the footer "More from this series" card grid, which renders up to six siblings as linked image cards with a truncated name under each, NOT through a thumbnail strip beside the main image. The former same-series thumbnail strip is removed because the card grid already lists those products; the gallery's own multi-image switcher is a different control and MUST be kept. A sold-out or not-yet-released product SHALL keep the bar visible but offer no dead control.

#### Scenario: Unknown code
- **WHEN** a product code does not exist
- **THEN** the API returns 404 and the page returns not-found

#### Scenario: Buy bar is always reachable
- **WHEN** the PDP renders below the 768px breakpoint
- **THEN** a `sticky bottom-0` bar is present showing the price and an add-to-bag action,
  and its computed `position` is `sticky` (never `fixed`, which the page-enter transform
  would trap inside the document flow)

#### Scenario: Three availability states
- **WHEN** the product is in stock, sold out, or not yet released
- **THEN** the bar shows price + add to bag, price + a disabled "Sold out" control, or the
  reveal notice respectively, and no state renders a control that does nothing

#### Scenario: Gallery is the product's own images
- **WHEN** Shopify returns more than one image for the product
- **THEN** the main image can be switched between them from a horizontally scrollable
  thumbnail strip of buttons (each marked `aria-current` when active), the main image `src`
  changes to the chosen image, and the strip is absent when only one image exists

#### Scenario: Same-series strip is gone, the sibling grid is not
- **WHEN** the PDP renders
- **THEN** no horizontally scrollable row of same-series *product* thumbnails appears beside
  the main image, while the footer "More from this series" grid still renders
  `min(siblings.length, 6)` linked cards, each with a visible product name

#### Scenario: Sold-out products are visible in listings
- **WHEN** a product is sold out
- **THEN** its card shows a "Sold out" pill, dims the image and stops linking the media
  block, while the list itself still contains the product
