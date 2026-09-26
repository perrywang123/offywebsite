## ADDED Requirements

### Requirement: Mobile navigation
On viewports below 768px, the header SHALL provide a hamburger button that opens a
drawer navigation containing the same links as the desktop nav plus the language
switcher. The drawer SHALL be dismissed by a close button, the Escape key, or a
backdrop tap.

#### Scenario: Hamburger opens drawer
- **WHEN** a mobile user taps the hamburger button
- **THEN** a navigation drawer opens with the main nav links

#### Scenario: Drawer dismissal
- **WHEN** the drawer is open and the user presses Escape or taps the backdrop
- **THEN** the drawer closes

### Requirement: SEO metadata
The site SHALL render document metadata: a root `generateMetadata` with title
template, description, Open Graph fields, and `alternates.languages` hreflang for
zh/en; the product detail page SHALL generate per-product title/description/OG
image. The site SHALL also serve `sitemap.xml` (all static routes + 19 product
pages + 3 collection pages) and `robots.txt`.

#### Scenario: Home page metadata
- **WHEN** a crawler fetches `/zh`
- **THEN** the HTML head contains a localized title, description, OG tags, and hreflang alternates

#### Scenario: Sitemap lists products
- **WHEN** a crawler fetches `/sitemap.xml`
- **THEN** it lists the home, products, collections, about, and all 19 product detail URLs in both locales

## MODIFIED Requirements

### Requirement: Motion quality bar
All entrance and hover animations SHALL use the editorial easing tokens with
durations matching the reference (hero 1.5s, header 400ms, card hovers 500ms)
and SHALL be disabled under `prefers-reduced-motion: reduce`. Every animation
utility referenced in markup SHALL exist in the theme (e.g. the collections hero
uses `animate-ken-burns`, not the nonexistent `ken-burns` class).

#### Scenario: Reduced motion
- **WHEN** the visitor prefers reduced motion
- **THEN** all entrance animations render content immediately without transforms

#### Scenario: Collections hero animates
- **WHEN** a collections page renders
- **THEN** the hero image plays the Ken Burns entrance (the animation class resolves)
