## MODIFIED Requirements

### Requirement: Homepage renders brand content

The homepage SHALL render the enabled Hero → eligible NEWS → Shop by Category (FEATURED, separate applicable REGIONAL EXCLUSIVE, then All Products circular thumbnails) → bag-charm teaser → collaboration → newsletter → upcoming IPs. The All Products roster SHALL enumerate the verified current-market non-merch catalog, independently of the six-item recommendation limit. The removed homepage Marquee SHALL NOT render; the shared Header promo bar SHALL display the enabled announcements. Collaboration SHALL link to /policies/contact, and active copy SHALL not use the retired playcoretoys.com contact. The original three series memberships, routes and ordering SHALL remain independent of homepage curation.

#### Scenario: Product and brand sections

- **WHEN** the homepage loads normally
- **THEN** the stated sections render in order, with the All Products thumbnail roster after regionals and no replacement three-series link strip or homepage Marquee

#### Scenario: Independent roster availability

- **WHEN** recommendations are unavailable but the current-market full catalog is verified
- **THEN** the All Products roster remains available; if its own read fails it is withheld without fabricated or stale products

### Requirement: Header behavior

The Header SHALL be sticky with a solid light navigation background and black text, with enabled announcement copy above it, rotating when more than one message is enabled. Desktop navigation appears from 768px; mobile navigation opens below that breakpoint. Below 768px the white toolbar SHALL be a single compact row with a logo, country-code control, icon-only bag with count and menu; bag and menu hit areas SHALL remain at least 44px. The mobile drawer SHALL retain the four primary links and Shopify-supplied series links, display series without surrounding or per-row borders, and include only FAQ and Contact Us in Help & Support. The Shipping & returns policy-index link SHALL NOT appear in the mobile drawer. The drawer country control, footer and existing policy pages SHALL remain available. Desktop bag presentation SHALL retain its text capsule. ResizeObserver SHALL publish actual header height to --header-h for sticky category offsets.

#### Scenario: Promo wraps

- **WHEN** a promo message changes header height
- **THEN** the published height follows the element and category tabs remain offset beneath it

#### Scenario: Mobile actions and help

- **WHEN** a mobile shopper opens the bag, country selector or menu
- **THEN** the existing actions still work, and a help or navigation link closes the menu before opening its existing site destination

#### Scenario: Two sidebar help entries

- **WHEN** the mobile sidebar opens
- **THEN** Help & Support shows FAQ linking to /faq and Contact Us linking to /policies/contact, without Shipping & returns or a sidebar link to /policies

### Requirement: Hero carousel with landing links

The Hero SHALL use the five configured slots in their existing order, omitting disabled slots. Default photography, copy and destinations SHALL match the original carousel. Replacements SHALL support complete banner artwork with alternative text. The Hero SHALL retain shared content-driven stable height and bottom indicators when multiple slides are enabled. Detail CTA and arrow render flags SHALL remain disabled. A manual pause control SHALL NOT be added without a separate approved change. Horizontal touch and mouse/pen drags SHALL move adjacent slides with the contact, without cross-fading or replacing the image at release. Release SHALL settle to the next/previous slide or back to the current slide using distance and recent velocity. Predominantly vertical gestures SHALL remain page scrolling; multi-touch/pointer cancellation SHALL abandon navigation and release autoplay. A drag SHALL NOT activate the full-slide link, including when dragged away and returned. Normal taps and keyboard activation SHALL retain navigation. Manual movement at either end SHALL have a bounded response without skipping through the gallery. Autoplay SHALL pause during interaction, restart after release and remain disabled for reduced motion. Reduced motion SHALL avoid animated settling while preserving manual selection.

#### Scenario: Follow the finger and settle

- **WHEN** a user drags horizontally between two home slides
- **THEN** the current and adjacent content move continuously in the same direction, and release finishes the movement without a fade/swap jump

#### Scenario: Scroll, cancel and tap

- **WHEN** a vertical gesture, multi-touch or cancellation occurs
- **THEN** it does not advance a slide or activate its link; a separate normal tap still activates the intended link

#### Scenario: Original layout retained

- **WHEN** the five screens render at phone or desktop widths and text wraps
- **THEN** the common height remains stable and copy stays clear of photography and indicators

#### Scenario: Interaction

- **WHEN** a shopper drags with mouse/pen or swipes with touch
- **THEN** the carousel follows horizontal contact and smoothly settles with click protection and vertical-intent arbitration

#### Scenario: Auto-advance and reduced motion

- **WHEN** the carousel is idle without reduced motion
- **THEN** it advances every five seconds; gestures pause/restart the timer, and reduced motion disables autoplay and animated settling

### Requirement: News module

NEWS SHALL show The Latest from OFFY without News· or the retired NEW ARRIVALS badge. Card images and destinations and the Browse All Series destination SHALL use published homepage settings. By default the feature uses the owner-provided `news-swan-queen.jpg` photograph and links to `swan-princess`; the secondary cards use `news-04.jpg`, `news-03.jpg`, `news-08.jpg` and `news-02.jpg` in that order. The homepage feature SHALL omit the visible ROMANTICIZING EVERYDAY LIFE headline while retaining a horizontally centered, compact VIEW DETAILS capsule placed clear of the photograph’s Limited 60 artwork and alternative text from the configuration or verified product name. Shopify product images SHALL NOT replace these editorial assets or determine image availability. Cards whose destinations are Offy product detail pages SHALL render only for Shopify-verified available products in the visitor market. The grid SHALL require an eligible feature and at least one eligible secondary card. Configured editorial destinations do not require a product binding. Product prices, inventory, product-detail media and checkout SHALL remain Shopify-authoritative.

#### Scenario: News links

- **WHEN** a verified card is activated
- **THEN** it opens the configured destination and the browse-all link stays outside the grid

#### Scenario: Curated editorial images

- **WHEN** the five bound products are verified as available, regardless of changes or omissions in their Shopify primary images
- **THEN** NEWS displays the five configured local editorial photographs in the existing layout and does not substitute Shopify product media

#### Scenario: Swan Queen feature without headline

- **WHEN** the default homepage feature is verified as available in the visitor market
- **THEN** its provided SWAN QUEEN photograph and VIEW DETAILS link open `/products/swan-princess`, the old headline is absent, and the image alternative text identifies the verified product

#### Scenario: Feature binding unavailable

- **WHEN** the configured feature links to an Offy product that is missing or unavailable in the visitor market
- **THEN** the homepage does not advertise the feature or substitute another product

#### Scenario: Compact centered feature CTA

- **WHEN** the NEWS feature renders on narrow and desktop screens
- **THEN** VIEW DETAILS is horizontally centered within its card, remains legible, avoids the Limited 60 artwork, and retains the whole-card product link

### Requirement: Shared shipping announcement

The default shared Header shipping promotion SHALL read `OFFY GOES GLOBAL · WORLDWIDE SHIPPING FROM $15 USD` for all visitor markets. It SHALL replace the previous flat-rate country-list message while preserving the separate gift promotion, existing rotation, black background, white text and responsive wrapping.

#### Scenario: Shipping announcement is displayed

- **WHEN** the Header rotation displays its default shipping promotion on any public page
- **THEN** the approved FROM wording is shown without the former country list or MORE REGIONS COMING SOON claim

### Requirement: Desktop NEWS feature CTA proportions

At the desktop NEWS grid breakpoint of 1024px, the feature VIEW DETAILS capsule SHALL grow proportionally with its card up to 320px wide, use 52–64px height and 18–24px text, remain horizontally centered and clear of the photograph's Limited artwork. Below this breakpoint it SHALL retain the existing 40% width, 176px cap, 40–48px height and 12–16px text. Secondary card capsules and whole-card links SHALL retain their original layout.

#### Scenario: Desktop feature at 1440px

- **WHEN** the viewport is 1440px wide and the NEWS grid renders
- **THEN** the feature capsule is at least 240px wide, larger than the previous 176px cap, centered and legible without covering the Limited artwork

#### Scenario: Compact mobile feature retained

- **WHEN** the NEWS grid renders on a 390px phone
- **THEN** the feature capsule keeps its previous approximately 143px width and 40px height, preserving its position and product link

### Requirement: Responsive brand slide clear space

The homepage brand slide SHALL retain its approved logo, English copy and full seven-character photographic row when it uses the original photograph. Brand copy SHALL be larger and readable on narrow screens, with a distinct primary and secondary line. Text and photography SHALL occupy non-overlapping normal-flow regions. Wrapped or enlarged text SHALL expand the layout instead of covering the photographed characters. The carousel frame SHALL accommodate its contents without jumping between slides, and the other four slots SHALL preserve their existing photographic proportions and copy by default.

#### Scenario: Mobile text expands

- **WHEN** the brand slide is viewed at 320px width or the text is enlarged to 200%
- **THEN** the full copy and all seven OFFYs remain visible without overlap or horizontal overflow

#### Scenario: Desktop proportion

- **WHEN** desktop content fits the original banner proportion
- **THEN** the brand slide retains that overall proportion with larger primary copy and a subordinate tagline

#### Scenario: Carousel changes slides

- **WHEN** a shopper changes between enabled slides
- **THEN** the frame height remains stable and existing swipe, link and indicator interactions remain available

### Requirement: Unclipped promo and series copy

Promo and series slides SHALL retain their original English copy by default and show their complete photographed subjects. The promo SHALL allow its existing two semantic title segments to wrap onto additional lines without clipping. Mobile series subtitles SHALL remain readable, and all text SHALL occupy normal-flow space separate from photography. Each layout SHALL reserve space for the shared indicators. Enlarged text SHALL increase the common frame height rather than cover subjects or indicators.

#### Scenario: Promo title wraps further

- **WHEN** the text size or font metrics make GET A FREE BIG TOTE wrap to an additional line
- **THEN** TOTE remains completely visible and the photo, text and indicators do not overlap

#### Scenario: Mobile series readability

- **WHEN** a shopper views the Princess, Streetwear or Dress-up slide on a narrow screen
- **THEN** the existing left-aligned primary title and subtitle remain complete, with mobile subtitles at least 12px in the default style

## ADDED Requirements

### Requirement: Administrator-managed homepage content

The guarded Offy admin SHALL expose 首页配置 in both accounting modes. The editor SHALL load the current published version or the current brand defaults. It SHALL configure image and destination per hero and Latest slot, enable or disable individual hero slides and announcements, and edit announcement text and the original promotion slide's copy. Links SHALL be storefront paths or HTTPS URLs. Uploaded raster images SHALL be previewable by the editor and persisted in the shared database. Authorized publishing SHALL atomically update the version and make its uploaded images publicly readable, rejecting stale edits. Published content SHALL be read by subsequent storefront requests. The settings apply to storefront presentation.

#### Scenario: First use

- **WHEN** an administrator opens the editor before any publish
- **THEN** the existing five hero images and destinations, two announcement messages and five Latest images and destinations are prefilled

#### Scenario: Save updates

- **WHEN** an administrator uploads a banner, changes its destination and publishes
- **THEN** the next storefront request uses the replacement image and destination, and the settings survive reloads

#### Scenario: Preserve other changes and prior version

- **WHEN** a second session tries to publish a stale version or submits invalid settings
- **THEN** publishing is rejected and the current storefront version remains intact

#### Scenario: Merchant access

- **WHEN** a visitor requests the guarded editor or tries to write settings without the existing administrator session and mutation checks
- **THEN** the request cannot read private editor state, upload media or publish configuration
