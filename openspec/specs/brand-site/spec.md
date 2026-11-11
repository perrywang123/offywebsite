# Brand Site Specification

## Purpose

Record the implemented is.offy brand storefront as of 2026-10-31. Historical PSD measurements and superseded behavior remain in change history. The approved Shopify unavailable-state design is implemented and included in this baseline.

## Requirements

### Requirement: Public language and URL handling

The routed locale set SHALL contain only en with as-needed prefixing. Public default-language URLs SHALL be unprefixed. The zh dictionary and source branches may remain, but no language switch SHALL be rendered in the current Header/MobileNav. Public canonical paths SHALL use publicPath().

#### Scenario: Historical language links

- **WHEN** /zh or /zh/* is requested
- **THEN** middleware issues 308 to the unprefixed path preserving query parameters; next-intl separately redirects /en/* with 307

### Requirement: Homepage renders brand content

The homepage SHALL render Hero → NEWS → Shop by Category (FEATURED, separate applicable REGIONAL EXCLUSIVE, then All Products circular thumbnails) → bag-charm teaser → collaboration → newsletter → upcoming IPs. The All Products roster SHALL enumerate the verified current-market non-merch catalog, independently of the six-item recommendation limit. The removed homepage Marquee SHALL NOT render; the Header promo bar SHALL remain. Collaboration SHALL link to /policies/contact, and active copy SHALL not use the retired playcoretoys.com contact. The original three series memberships, routes and ordering SHALL remain independent of homepage curation.

#### Scenario: Product and brand sections

- **WHEN** the homepage loads normally
- **THEN** the stated sections render in order, with the All Products thumbnail roster after regionals and no replacement three-series link strip or homepage Marquee

#### Scenario: Independent roster availability

- **WHEN** recommendations are unavailable but the current-market full catalog is verified
- **THEN** the All Products roster remains available; if its own read fails it is withheld without fabricated or stale products

### Requirement: Header behavior

The Header SHALL be sticky with a solid light navigation background and black text, with rotating promo copy above it. Desktop navigation appears from 768px; mobile navigation opens below that breakpoint. Below 768px the white toolbar SHALL be a single compact row with a logo, country-code control, icon-only bag with count and menu; bag and menu hit areas SHALL remain at least 44px. The mobile drawer SHALL retain the four primary links and Shopify-supplied series links, display series without surrounding or per-row borders, and include Help & Support links to the policy index, FAQ and contact page. Desktop bag presentation SHALL retain its text capsule. ResizeObserver SHALL publish actual header height to --header-h for sticky category offsets.

#### Scenario: Promo wraps

- **WHEN** a promo message changes header height
- **THEN** the published height follows the element and category tabs remain offset beneath it

#### Scenario: Mobile actions and help

- **WHEN** a mobile shopper opens the bag, country selector or menu
- **THEN** the existing actions still work, and a help or navigation link closes the menu before opening its existing site destination

### Requirement: Hero carousel with landing links

The Hero SHALL contain five photo-based slides, live overlay copy, a 3250/2041 aspect ratio and bottom indicators. All five slides SHALL have full-screen links to /about, /products and the three mapped series. Detail CTA and arrow controls SHALL remain behind disabled render flags, not invisible focusable anchors. A manual pause control SHALL NOT be added without a separate approved change.

#### Scenario: Interaction

- **WHEN** a shopper drags with mouse/pen or swipes with touch
- **THEN** the carousel applies the existing threshold/flick behavior, settles the visual track and suppresses a gesture-generated navigation click

#### Scenario: Auto-advance and reduced motion

- **WHEN** the carousel is idle without reduced motion
- **THEN** it advances every five seconds; gestures pause/restart the timer, and reduced motion disables autoplay and drag animation

### Requirement: News module

NEWS SHALL show The Latest from OFFY without News· or the retired NEW ARRIVALS badge. Product bindings, editorial copy and the five curated local editorial photographs SHALL remain site configuration. The feature SHALL use the owner-provided `news-swan-queen.jpg` photograph and link to `swan-princess`; the secondary cards SHALL use `news-04.jpg`, `news-03.jpg`, `news-08.jpg` and `news-02.jpg` in their configured order. The homepage feature SHALL omit the visible ROMANTICIZING EVERYDAY LIFE headline while retaining a horizontally centered, compact VIEW DETAILS capsule placed clear of the photograph’s Limited 60 artwork and meaningful alternative text from the verified product name. Shopify product images SHALL NOT replace these editorial assets or determine image availability. Cards SHALL still render only for Shopify-verified available products in the visitor market. Missing bindings SHALL be hidden rather than advertised as available products. Product prices, inventory, product-detail media and checkout SHALL remain Shopify-authoritative.

#### Scenario: News links

- **WHEN** a verified card is activated
- **THEN** it opens the configured Shopify product handle and the browse-all link stays outside the grid

#### Scenario: Curated editorial images

- **WHEN** the five bound products are verified as available, regardless of changes or omissions in their Shopify primary images
- **THEN** NEWS displays the five configured local editorial photographs in the existing layout and does not substitute Shopify product media

#### Scenario: Swan Queen feature without headline

- **WHEN** the homepage feature is verified as available in the visitor market
- **THEN** its provided SWAN QUEEN photograph and VIEW DETAILS link open `/products/swan-princess`, the old headline is absent, and the image alternative text identifies the verified product

#### Scenario: Feature binding unavailable

- **WHEN** `swan-princess` is missing or unavailable in the visitor market
- **THEN** the homepage does not advertise the feature or substitute another product

#### Scenario: Compact centered feature CTA

- **WHEN** the NEWS feature renders on narrow and desktop screens
- **THEN** VIEW DETAILS is horizontally centered within its card, remains legible, avoids the Limited 60 artwork, and retains the whole-card product link

### Requirement: Homepage visual sections

NEWS SHALL use #efefef, category/upcoming sections #f7f7f9. Removed full-size background texture images SHALL NOT be reintroduced. Upcoming Releases SHALL lead to /bag-charm; collaboration, newsletter and future IP cards SHALL keep their existing current arrangement.

#### Scenario: Upcoming IP cards

- **WHEN** the future-IP section renders
- **THEN** it shows Miss Kitty and Butterfly Sprite with illustrations, IN DEVELOPMENT labels and taglines, without the retired PSYCHE or COMING SOON placeholders

### Requirement: Regional-exclusive presentation

Regionals SHALL be inferred only after all configured probe countries return complete successful Storefront rosters, with at least two countries and the visitor inside the probe scope. Probe scope and target whitelist remain independent. Failed probes SHALL hide uncertain inferences. Merch SHALL be excluded from the homepage; regional display prices SHALL reuse the verified visitor-market catalog.

#### Scenario: Non-target visitor

- **WHEN** the visitor is outside the target whitelist or any required probe fails
- **THEN** no regional-exclusive section is rendered

### Requirement: Series and catalog presentation

Catalog and series pages SHALL render current Shopify names and product facts with sticky category navigation when those data are available. Site slugs, hero assets and taglines remain configuration; local series titles SHALL NOT replace failed or removed Shopify collections. Overview cards retain the whole-series editorial photos. Unavailable data SHALL show the approved recovery presentation.

#### Scenario: Series identity

- **WHEN** outdoor-sporty or playful-life successfully renders
- **THEN** its image shows the streetwear/sport or dress-up group respectively, with the Shopify collection title

### Requirement: Bag charm teaser detail page

/bag-charm SHALL show the two-line title, two hero images and six coded teaser images. View controls SHALL open an in-page quick view, not navigate to the catalog. Hover-capable devices SHALL open after 1s, pointer departure SHALL close temporary preview after a grace period, and clicking SHALL pin it until explicit dismissal. The overlay SHALL use a body Portal and scroll lock.

#### Scenario: Explicit dismissal

- **WHEN** the user presses Escape, close or the backdrop
- **THEN** the quick view closes and page scroll is restored

### Requirement: About and support content

/about SHALL use Meet Who You Love to Be, the current twelve story paragraphs, future-IP cards and collaboration content. Retired team and stockists sections SHALL NOT render. FAQ SHALL contain eleven structured English answers in three parts, native details/summary and question numbering restarted per part. Shipping Q1 SHALL be `How much does shipping cost?` with three paragraphs: `We ship worldwide for $15 USD per order.`, `For US deliveries only, shipping is $20 USD when you order 3 or more OFFYs.`, and `Shipping is charged once per order.` The previous five Shipping questions SHALL become Q2–Q6 without answer changes; the other two parts SHALL remain unchanged. Questions SHALL be collapsed by default and FAQ structured data SHALL contain the same eleven questions and answers.

#### Scenario: FAQ formatting

- **WHEN** an answer is expanded
- **THEN** its paragraphs and bold segments match the current FaqPart data rather than an unformatted plain-text paragraph

#### Scenario: Shipping-cost question

- **WHEN** the FAQ page first loads
- **THEN** Shipping starts with the collapsed approved Q1 followed by the previous dispatch question as Q2, with all three exact answer paragraphs available on expansion

### Requirement: Footer policy entry points

The footer SHALL provide Menu, Collections and Help & Support. Help & Support SHALL show FAQ and CONTACT US, then a separated weaker LEGAL & POLICIES link to /policies. Four written policies SHALL be listed inside that index; contact remains a direct entry. The brand blurb SHALL keep its explicit line break. Footer uses two columns at md and four at lg.

#### Scenario: Policy navigation

- **WHEN** the footer is rendered
- **THEN** it links to /faq, /policies/contact and /policies without language prefixes, not the retired five-flat-policy-link arrangement

### Requirement: Responsive design contract

Layouts SHALL reuse the current theme, container-site, section-y, tap-target, hscroll and safe-area classes. The PDP mobile purchase bar SHALL be sticky, never fixed inside the transformed page template. Small-screen layouts SHALL be checked at 320/375px; source-rule tests alone SHALL NOT be treated as geometry verification. The root viewport SHALL include viewportFit cover.

#### Scenario: Mobile PDP baseline

- **WHEN** the PDP renders at 375×812
- **THEN** its purchase action remains at the viewport bottom and the page does not scroll horizontally

### Requirement: Motion and overlays

Entrance/reveal animations SHALL honor reduced motion. The cart drawer and teaser quick view SHALL use the shared scroll lock and restore prior inline overflow. MobileNav currently closes by link/backdrop/Escape but does not yet share all cart focus/scroll behavior; full modal compliance is not claimed.

#### Scenario: Reduced motion content

- **WHEN** reduced motion is active
- **THEN** entrance content is immediately visible and the relevant theme animations are disabled

### Requirement: SEO metadata

Core pages SHALL have their own canonical/title/description. Home SHALL have a visually hidden semantic H1. Product/Offer and breadcrumbs SHALL use the rendered market product; Organization/WebSite SHALL appear once per page and FAQPage on FAQ. JsonLd SHALL escape < before embedding. Sitemap SHALL derive routed languages, current catalog/series and policy handles; robots SHALL disallow API/cart/checkout. Shopify seo.title/description are not yet read.

#### Scenario: Market product structured data

- **WHEN** a product page renders GBP or HKD
- **THEN** its Offer priceCurrency and amount match that page's displayed product rather than a hardcoded USD value

### Requirement: Health endpoint

/api/health SHALL return status ok with timestamp and configuration-presence diagnostics. It SHALL NOT make a Shopify request or imply valid credentials, a healthy database or a successful checkout.

#### Scenario: Liveness check

- **WHEN** the container health check calls the endpoint
- **THEN** HTTP 200 confirms that the handler is alive, independent of Shopify reachability

### Requirement: Brand-preserving commerce outage presentation

The storefront SHALL retain independently available brand content and its navigation when Shopify commercial data fails. Product-specific editorial cards and product modules SHALL not present unverified commercial content. The homepage SHALL consolidate affected commerce modules into one clear local unavailable presentation. Healthy independently loaded modules SHALL remain visible.

#### Scenario: Homepage commerce outage

- **WHEN** Shopify product data is unavailable
- **THEN** the brand hero, story and support remain reachable, while affected product sections are replaced by a retry presentation

### Requirement: Outage indexing protection

Unavailable commerce HTML SHALL be excluded from indexing and SHALL emit no Product Offer or fabricated product count. Confirmed product absence SHALL retain its separate not-found behavior. Sitemap generation SHALL never substitute the local catalog after upstream failure or publish a failed partial product enumeration as complete.

#### Scenario: Detail outage has no false product offer

- **WHEN** a detail unavailable state is rendered
- **THEN** it carries noindex and no Product/Offer JSON-LD

### Requirement: Shared shipping announcement

The shared Header shipping promotion SHALL read `OFFY GOES GLOBAL · WORLDWIDE SHIPPING FROM $15 USD` for all visitor markets. It SHALL replace the previous flat-rate country-list message while preserving the separate gift promotion, existing rotation, black background, white text and responsive wrapping.

#### Scenario: Shipping announcement is displayed

- **WHEN** the Header rotation displays its shipping promotion on any public page
- **THEN** the approved FROM wording is shown without the former country list or MORE REGIONS COMING SOON claim

### Requirement: Shopify-curated homepage selection

The homepage SHALL prefer the Shopify collection `featured` in its merchant-defined collection order and current visitor market. It SHALL show at most six distinct available non-merch products belonging to the existing three series, excluding all verified current-market regional identities. It SHALL NOT re-sort curated candidates by creation time. A successfully empty or fully excluded collection SHALL remain an empty recommendation state. If the curated collection is missing or cannot be read, the homepage SHALL use the original two-newest-created-per-series live Shopify selection, excluding regionals before applying each series limit. A fallback read failure SHALL retain the commerce unavailable presentation without local product facts.

#### Scenario: Curated ordering and substitutions

- **WHEN** the merchant orders available, unavailable, repeated and regional candidates in featured
- **THEN** the homepage preserves the relative order of eligible unique candidates, continuing within that collection up to six without changing original series pages

#### Scenario: Collection not configured yet

- **WHEN** featured is absent or its read fails but the existing series and regional classification succeed
- **THEN** FEATURED uses current Shopify creation times, two per series, with regional identities excluded before taking limits

#### Scenario: Genuine empty curation

- **WHEN** featured is read successfully but has no eligible products
- **THEN** the homepage shows a deliberate empty state and catalog navigation without silently replacing the merchant selection

### Requirement: Separate and bounded homepage presentation

Main looks and regional cards SHALL have disjoint product identities. Regional cards SHALL appear only for the applicable destination, with no single-country claim inferred from multiple-country visibility. Incomplete required visibility probes SHALL make homepage recommendations unavailable, not imply absence of regionals. Both sections SHALL retain the original shared ProductCard photography (4:5 cover media), visible names/market prices, regional badge, container-site width, desktop three-column/mobile two-column grid and original spacing. The main title SHALL read FEATURED for both curated and time-based selection. REGIONAL EXCLUSIVE SHALL align above its grid and use the same heading size, weight and level as FEATURED, without a compact sidebar layout. All Products SHALL retain circular current-market thumbnails and accessible product links. Empty/error behavior SHALL preserve independently verified editorial content and roster. Original series pages and checkout SHALL remain unchanged.

#### Scenario: Regional classification fails

- **WHEN** a required country visibility read is incomplete
- **THEN** recommendations are withheld with retry presentation rather than allowing an unclassified exclusive into the main recommendation grid

#### Scenario: Original visual style and fixed section labels

- **WHEN** curated or fallback recommendations render
- **THEN** FEATURED and REGIONAL EXCLUSIVE share heading typography, photography uses the original product-card grid, and All Products displays the verified non-merch catalog without a six-item limit

#### Scenario: Responsive product comparison

- **WHEN** the module is viewed at 320/375px, 768px, 1440px or a wide desktop
- **THEN** names, market prices, circular thumbnails and navigation remain readable without page horizontal overflow

### Requirement: Desktop NEWS feature CTA proportions

At the desktop NEWS grid breakpoint of 1024px, the feature VIEW DETAILS capsule SHALL grow proportionally with its card up to 320px wide, use 52–64px height and 18–24px text, remain horizontally centered and clear of the photograph's Limited artwork. Below this breakpoint it SHALL retain the existing 40% width, 176px cap, 40–48px height and 12–16px text. Existing editorial images, secondary card capsules, product binding and whole-card link SHALL remain unchanged.

#### Scenario: Desktop feature at 1440px

- **WHEN** the viewport is 1440px wide and the NEWS grid renders
- **THEN** the feature capsule is at least 240px wide, larger than the previous 176px cap, centered and legible without covering the Limited artwork

#### Scenario: Compact mobile feature retained

- **WHEN** the NEWS grid renders on a 390px phone
- **THEN** the feature capsule keeps its previous approximately 143px width and 40px height, preserving its position and product link
