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

The homepage SHALL render Hero → NEWS → shop by category (New Looks, applicable regionals, non-merch roster) → bag-charm teaser → collaboration → newsletter → upcoming IPs. The removed homepage Marquee SHALL NOT render; the Header promo bar SHALL remain. Collaboration SHALL link to /policies/contact, and active copy SHALL not use the retired playcoretoys.com contact.

#### Scenario: Product and brand sections

- **WHEN** the homepage loads normally
- **THEN** the sections appear in the stated order, with no repeated standalone product roster or homepage Marquee

### Requirement: Header behavior

The Header SHALL be sticky with a solid light navigation background and black text, with rotating promo copy above it. Desktop navigation appears from 768px; mobile navigation opens below that breakpoint. ResizeObserver SHALL publish actual header height to --header-h for sticky category offsets.

#### Scenario: Promo wraps

- **WHEN** a promo message changes header height
- **THEN** the published height follows the element and category tabs remain offset beneath it

### Requirement: Hero carousel with landing links

The Hero SHALL contain five photo-based slides, live overlay copy, a 3250/2041 aspect ratio and bottom indicators. All five slides SHALL have full-screen links to /about, /products and the three mapped series. Detail CTA and arrow controls SHALL remain behind disabled render flags, not invisible focusable anchors. A manual pause control SHALL NOT be added without a separate approved change.

#### Scenario: Interaction

- **WHEN** a shopper drags with mouse/pen or swipes with touch
- **THEN** the carousel applies the existing threshold/flick behavior, settles the visual track and suppresses a gesture-generated navigation click

#### Scenario: Auto-advance and reduced motion

- **WHEN** the carousel is idle without reduced motion
- **THEN** it advances every five seconds; gestures pause/restart the timer, and reduced motion disables autoplay and drag animation

### Requirement: News module

NEWS SHALL show The Latest from OFFY without News· or the retired NEW ARRIVALS badge. Product bindings, editorial copy and the five curated local editorial photographs SHALL remain site configuration. The feature SHALL use `news-01.jpg`; the secondary cards SHALL use `news-04.jpg`, `news-03.jpg`, `news-08.jpg` and `news-02.jpg` in their configured order. Shopify product images SHALL NOT replace these editorial assets or determine image availability. Cards SHALL still render only for Shopify-verified available products in the visitor market. Missing bindings SHALL be hidden rather than advertised as available products. Product prices, inventory, product-detail media and checkout SHALL remain Shopify-authoritative.

#### Scenario: News links

- **WHEN** a verified card is activated
- **THEN** it opens the configured Shopify product handle and the browse-all link stays outside the grid

#### Scenario: Curated editorial images

- **WHEN** the five bound products are verified as available, regardless of changes or omissions in their Shopify primary images
- **THEN** NEWS displays the five configured local editorial photographs in the existing layout and does not substitute Shopify product media

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

/about SHALL use Meet Who You Love to Be, the current twelve story paragraphs, future-IP cards and collaboration content. Retired team and stockists sections SHALL NOT render. FAQ SHALL contain ten structured English answers in three parts, native details/summary and question numbering restarted per part.

#### Scenario: FAQ formatting

- **WHEN** an answer is expanded
- **THEN** its paragraphs and bold segments match the current FaqPart data rather than an unformatted plain-text paragraph

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
