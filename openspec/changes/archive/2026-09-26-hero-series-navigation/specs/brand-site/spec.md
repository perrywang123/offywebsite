## MODIFIED Requirements

### Requirement: Hero carousel with landing links
The homepage hero SHALL be a 5-slide carousel (auto-advancing, swipeable). Slides
1-3 link to the corresponding series pages `/[locale]/collections/princess-lady`,
`/collections/outdoor-sporty`, `/collections/playful-life`; slides 4-5 (promo and
brand-group images) are NOT clickable.

#### Scenario: Slide links to landing
- **WHEN** the user clicks hero slide 1, 2 or 3
- **THEN** they navigate to the matching series collection page (`/collections/princess-lady`, `/collections/outdoor-sporty`, `/collections/playful-life`) — the landing-page destination is superseded by the series pages

#### Scenario: Non-linked slides
- **WHEN** the user taps hero slide 4 or 5
- **THEN** nothing happens (no navigation)

#### Scenario: Auto-advance
- **WHEN** the hero is visible and idle
- **THEN** slides advance automatically with a cross-fade transition

### Requirement: Sticky category tab bar
Catalog and collection pages SHALL render a horizontally-scrollable category
tab bar that sticks below the header while scrolling, with the active category
bold. The collection page hero SHALL display the series' own hero image
(`series.heroImage`) with the Ken Burns entrance.

#### Scenario: Following scroll
- **WHEN** the visitor scrolls a collection page
- **THEN** the category tab bar remains visible directly below the header

#### Scenario: Series hero shows the series hero image
- **WHEN** a collections page renders
- **THEN** the hero shows that series' dedicated hero image, not a product photo

## REMOVED Requirements

### Requirement: Hero landing pages
A route `/[locale]/landing/[id]` (id 1-3) SHALL render a scrollable page where each
viewport-height section shows one slice of the corresponding long landing image.
Invalid ids return 404.

#### Scenario: Landing page renders slices
- **WHEN** the user opens `/zh/landing/1`
- **THEN** 5 full-screen sections render, each showing one slice of landing image 1

#### Scenario: Invalid id
- **WHEN** the user opens `/zh/landing/9`
- **THEN** a 404 is returned

**Reason**: 交互改为头图直跳系列页;落地页因布局缺陷(高度塌缩全黑)且不再被
链接,整体移除。
