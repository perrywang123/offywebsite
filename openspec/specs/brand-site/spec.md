# Brand Site Specification

## Purpose
The public marketing site for the Offy brand: a responsive homepage that communicates brand identity, product highlights, and contact information.

## Requirements

### Requirement: Homepage renders brand content
The homepage SHALL present the is.offy™ brand (黑皮 OFFY · 37 个化身) with the
following section order: hero carousel → promo bar → news → shop by category
(centered title group + latest looks + regional-exclusive group + product-summary
roster) → upcoming series teaser → collab (14 OF looks) → future IPs → newsletter.
Brand copy uses "让想象落地，让陪伴发生" and "仪式感生活" messaging.

#### Scenario: Visitor loads the homepage
- **WHEN** a visitor requests `/`
- **THEN** the server returns HTTP 200 with the hero carousel, merged category section, and newsletter section

#### Scenario: Category tiles link to category pages
- **WHEN** a visitor clicks a product card in the merged category section
- **THEN** they land on that product's detail page

#### Scenario: Regional-exclusive group
- **WHEN** the merged category section renders
- **THEN** after the latest-looks grid, a 「区域限定:」 group shows the badge-marked
  products (CPL02/CPL08 → AVAILABLE IN THE U.S. ONLY, FLS10 → AVAILABLE IN THE UK ONLY)
  with red flag badges on the cards

#### Scenario: Product-summary roster inside the category section
- **WHEN** the merged category section renders
- **THEN** after the regional group, a 「产品汇总-选购同款造型:」 label and the
  circular-avatar roster of all products appear; no separate roster section exists
  later on the page

#### Scenario: Brand sections are present
- **WHEN** the homepage renders
- **THEN** it contains a news section, a teaser section, a collab section, a newsletter section, and a contact footer

### Requirement: Health endpoint
The site SHALL expose a liveness endpoint for monitoring.

#### Scenario: Health check
- **WHEN** a monitor requests `/api/health`
- **THEN** the server returns HTTP 200 with a JSON `status: "ok"` payload

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
bold. The collection page hero SHALL display the series' own hero image
(`series.heroImage`) with the Ken Burns entrance.

#### Scenario: Following scroll
- **WHEN** the visitor scrolls a collection page
- **THEN** the category tab bar remains visible directly below the header

#### Scenario: Series hero shows the series hero image
- **WHEN** a collections page renders
- **THEN** the hero shows that series' dedicated hero image, not a product photo

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

### Requirement: Hero carousel with landing links

The homepage hero SHALL be a 5-slide carousel (auto-advancing, swipeable) rebuilt from
the main PSD UI tree (`is.offy 网站.psd`). Slide 1 (brand group photo) shows the
hand-written is.offy wordmark image (596×224 PSD vector layer) centered near the top
with the one-line slogan「让想象落地 让陪伴发生」below it, and is NOT clickable.
Slide 2 is the promo composite screen (PSD「头图-活动奖励」group): white background,
the doll photo (2882×1905 source, cropped to subject) on the left at x11%/y10%/w46%/h50%,
a 2×2 grid of four bag photos at x61.7%/y18.2%, and the two-line promo copy PNG at
x11.5%/y62.4%; it is NOT clickable. Slides 3-5 are series screens in the「dolls upper
frame + bottom-left title group」pattern: the OFFY+series title PNG at x11.5%/y62.4%,
a subtitle PNG (生活需要仪式感/周末出门玩/日常犯可爱) right-aligned to the OFFY line at
x39.9%/y62.6%, and an outlined「查看详情」CTA button at x58%/y73.1% linking to the
matching series collection page. The fashion slide (slide 4) uses WHITE title/subtitle
on its dark full-bleed photo; other series slides use dark text on light. Slide
controls SHALL be a centered line indicator at the bottom plus dark prev/next arrow
buttons at the bottom-right using the PSD 50×23 arrow PNGs. Series slides MUST NOT
wrap the whole slide in an anchor (the CTA is the only navigation entry, avoiding
nested anchors). All hero text and images SHALL scale with viewport-relative clamp()
constraints (min/max caps) so that on narrow viewports text shrinks proportionally,
wraps when too long, and never overflows or clips.

#### Scenario: Series slide bottom-left title group
- **WHEN** the user browses to hero slide 3, 4 or 5 (公主lady / 时尚潮流生活 / 趣味生活)
- **THEN** the bottom-left shows the OFFY+series title image, the subtitle image
  right-aligned to the OFFY line, and a「查看详情」outlined CTA; the fashion slide
  renders them in white, others in dark ink

#### Scenario: Slide links to landing
- **WHEN** the user clicks the「查看详情」button on a series slide (3/4/5)
- **THEN** they navigate to the matching series collection page
  (`/collections/princess-lady` / `/collections/outdoor-sporty` / `/collections/playful-life`)

#### Scenario: CTA navigates to landing
- **WHEN** the user clicks the「查看详情」button on a series slide
- **THEN** they navigate to the matching series collection page
  (`/collections/princess-lady` / `/collections/outdoor-sporty` / `/collections/playful-life`)

#### Scenario: Non-linked slides
- **WHEN** the user taps hero slide 1 or 2
- **THEN** nothing happens (no navigation)

#### Scenario: Slide 1 text overlay
- **WHEN** slide 1 is active
- **THEN** the hand-written is.offy wordmark image renders centered near the top, with the slogan beneath it

#### Scenario: Slide 1 wordmark and slogan
- **WHEN** slide 1 renders
- **THEN** the 596×224 is.offy wordmark image shows centered near the top (y≈9.7% of
  the hero area) with the slogan「让想象落地 让陪伴发生」as one line beneath it (y≈29.5%)

#### Scenario: Slide 1 wordmark and one-line slogan
- **WHEN** slide 1 renders
- **THEN** the 596×224 is.offy wordmark image shows centered near the top (y≈9.7% of
  the hero area) with the slogan「让想象落地 让陪伴发生」as one line beneath it (y≈29.5%)

#### Scenario: No image cropping
- **WHEN** any slide renders on any viewport
- **THEN** the full photo is visible (object-contain) on a backdrop matching the photo's edge color

#### Scenario: Promo composite screen
- **WHEN** slide 2 renders
- **THEN** the doll photo, the 2×2 grid of four bag photos, and the two-line promo
  copy PNG render on a white background at PSD-derived positions

#### Scenario: Series slides show OFFY titles
- **WHEN** slides 3-5 render
- **THEN** each shows the OFFY + series title image in the bottom-left title group

#### Scenario: Dark fashion slide readability
- **WHEN** slide 4 (时尚潮流生活) renders
- **THEN** its title, subtitle and CTA render in white over the dark photo and remain readable

#### Scenario: Arrow navigation
- **WHEN** the user clicks the next arrow
- **THEN** the carousel advances to the next slide; the prev arrow goes back

#### Scenario: Auto-advance
- **WHEN** the hero is visible and idle
- **THEN** slides advance automatically with a cross-fade transition

#### Scenario: Mobile proportional scaling
- **WHEN** the viewport is ≤768px wide
- **THEN** hero text and title images shrink proportionally within clamp() bounds,
  the slogan wraps instead of overflowing, and the series title group never clips

### Requirement: News module
The homepage SHALL render the news section as an editorial asymmetric layout: one
large feature card on the left (新品上市 badge + 仪式感生活 headline + 查看详情
button) and a 2×2 grid of four smaller cards on the right, followed by a
"逛全部系列" CTA linking to the products page.

#### Scenario: News cards render
- **WHEN** the homepage renders
- **THEN** 1 feature card + 4 secondary cards render with images and localized titles

#### Scenario: Browse-all CTA
- **WHEN** the user clicks 逛全部系列
- **THEN** they navigate to the products page

### Requirement: Teaser section for upcoming series
The homepage SHALL render the teaser section with a centered title group
(OFFY 新品抢先看 / 更多新品，敬请期待) above a full-bleed panel: the teaser hero
image fills the panel as background, the left column overlays 接下来 /
/时尚包挂系列 / 具体发布时间以 INS 为准 and a solid black pill 查看详情 button.

#### Scenario: Teaser renders
- **WHEN** the homepage renders
- **THEN** the centered title, background hero image, left overlay text, and black pill CTA appear

### Requirement: Bag charm teaser detail page
A route `/[locale]/bag-charm` SHALL render the fashionable bag charm series teaser
detail page per the design draft: a hero area with the oversized two-line English
title "FASHIONABLEBAG CHARM COLLECTION", a large left image and a tall right image
(both derived from the teaser hero photo), a title block (时尚包挂系列 /
更多都市精灵，敬请期待), and a 3-column grid of 6 teaser product cards coded
WCOFFY-XXX01..06, each with a 「点击查看」 link to the products page.

#### Scenario: Teaser page renders
- **WHEN** a visitor opens `/zh/bag-charm`
- **THEN** the hero title, two hero images, title block, and 6 coded teaser cards render

#### Scenario: Card CTA navigates to products
- **WHEN** a visitor clicks 点击查看 on a teaser card
- **THEN** they navigate to the products page

#### Scenario: Homepage teaser button links here
- **WHEN** a visitor clicks 查看详情 in the homepage teaser section
- **THEN** they navigate to `/[locale]/bag-charm`

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
