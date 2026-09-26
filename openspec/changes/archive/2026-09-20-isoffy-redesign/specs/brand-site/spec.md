## ADDED Requirements

### Requirement: Hero carousel with landing links
The homepage hero SHALL be a 5-slide carousel (auto-advancing, swipeable), where each
slide links to its corresponding landing page `/[locale]/landing/[1-3]` (slides 4-5
link to the products page as fallback until dedicated landings exist).

#### Scenario: Slide links to landing
- **WHEN** the user clicks hero slide 1-3
- **THEN** they navigate to `/[locale]/landing/1|2|3`

#### Scenario: Auto-advance
- **WHEN** the hero is visible and idle
- **THEN** slides advance automatically with a cross-fade transition

### Requirement: News module
The homepage SHALL render a "最新资讯 · 揭晓" section with 8 image cards driven by a
local data list (title + image). Cards are display-only for now; a detail route is
reserved for a future change.

#### Scenario: News cards render
- **WHEN** the homepage renders
- **THEN** 8 news cards with images and localized titles appear

### Requirement: Teaser section for upcoming series
The homepage SHALL render a "更多新品，敬请期待" teaser section for the upcoming
fashionable bag charm series, using teaser assets, with a note that release timing
follows Instagram.

#### Scenario: Teaser renders
- **WHEN** the homepage renders
- **THEN** the teaser hero image and product preview images appear with the
  "具体发布时间以 INS 为准" note

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

## MODIFIED Requirements

### Requirement: Homepage renders brand content
The homepage SHALL present the is.offy™ brand (黑皮 OFFY · 37 个化身) with the
following section order: hero carousel → promo bar → news → shop by category
(3 series) → latest looks → upcoming series teaser → collab (14 OF looks) →
future IPs → newsletter. Brand copy uses "让想象落地，让陪伴发生" and
"仪式感生活" messaging.

#### Scenario: Visitor loads the homepage
- **WHEN** a visitor requests `/`
- **THEN** the server returns HTTP 200 with the hero carousel, category grid, latest looks, and newsletter section

#### Scenario: Category tiles link to category pages
- **WHEN** a visitor clicks a category tile
- **THEN** they land on a category page listing only that category's products

#### Scenario: Brand sections are present
- **WHEN** the homepage renders
- **THEN** it contains a news section, a teaser section, a collab section, a newsletter section, and a contact footer

### Requirement: Footer wordmark signature
The footer SHALL display the is.offy™ wordmark as a full-width signature above
the link columns.

#### Scenario: Wordmark spans the container
- **WHEN** the footer renders on desktop
- **THEN** the wordmark stretches to the full container width and reads "is.offy™"
