## MODIFIED Requirements

### Requirement: Homepage renders brand content
The homepage SHALL render, in order: a full-height hero with Ken Burns image
entrance, a "Shop your category" grid linking to category landing pages, a
full-bleed core-product editorial part, brand manifesto, lookbook parts, and a
newsletter section — each part approximately one viewport tall on desktop, with
scroll-triggered entrance animations.

#### Scenario: Visitor loads the homepage
- **WHEN** a visitor requests `/`
- **THEN** the server returns HTTP 200 with the hero, category grid, core-product part, and newsletter section

#### Scenario: Category tiles link to category pages
- **WHEN** a visitor clicks a category tile
- **THEN** they land on a category page listing only that category's products

#### Scenario: Brand sections are present
- **WHEN** the homepage renders
- **THEN** it contains an about section, a newsletter section, and a contact footer

## ADDED Requirements

### Requirement: Header behavior
The header SHALL be fixed, transparent over the hero, and slide in a solid
background (400ms) once the page is scrolled; it SHALL expose a Shop menu
listing all categories.

#### Scenario: Scrolled header
- **WHEN** the visitor scrolls past the hero
- **THEN** the header background slides in and the wordmark/logo animates in with a 300ms delay

### Requirement: Sticky category tab bar
Catalog and collection pages SHALL render a horizontally-scrollable category
tab bar that sticks below the header while scrolling, with the active category
bold.

#### Scenario: Following scroll
- **WHEN** the visitor scrolls a collection page
- **THEN** the category tab bar remains visible directly below the header

### Requirement: Footer wordmark signature
The footer SHALL display the company wordmark as a full-width signature above
the link columns.

#### Scenario: Wordmark spans the container
- **WHEN** the footer renders on desktop
- **THEN** the wordmark stretches to the full container width

### Requirement: Motion quality bar
All entrance and hover animations SHALL use the editorial easing tokens with
durations matching the reference (hero 1.5s, header 400ms, card hovers 500ms)
and SHALL be disabled under `prefers-reduced-motion: reduce`.

#### Scenario: Reduced motion
- **WHEN** the visitor prefers reduced motion
- **THEN** all entrance animations render content immediately without transforms
