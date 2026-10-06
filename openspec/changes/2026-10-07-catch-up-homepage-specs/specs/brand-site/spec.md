## ADDED Requirements

### Requirement: Coming-next IP cards

The homepage SHALL render the coming-next section (`后续计划.psd`) with a heading block
containing only the section title and its one-line subtitle — the section MUST NOT render a
kicker above the title, because the PSD has no such layer. Below it, two cards SHALL render
side by side (stacked on narrow viewports), each built from the PSD layer tree: a rounded
card clipped at its bounds, a dotted background (base `#e7e7e7`, dot pitch 43px = 2.97% of
card width), the character illustration anchored at x33.0%/y-5.3% with width 72.1% and
allowed to overflow above and below before being clipped, an `IN DEVELOPMENT` pill at
x6.9%/y37.8% with width 32.9% and height 6.5% of card height in `#424242`, the name at
6.21% of card width, and the two-line centred tagline. Card copy SHALL come from the
`upcomingIps` data and the illustrations from assets exported out of the PSD's smart-object
layers. The section MUST NOT render a "COMING SOON — TBD" label, and the second IP SHALL be
named `Butterfly Sprite` (the earlier placeholder name `PSYCHE` is retired).

#### Scenario: Cards render the PSD structure

- **WHEN** the coming-next section renders
- **THEN** each card shows its character illustration, an `IN DEVELOPMENT` pill, the IP name
  and a two-line centred tagline, and no card shows a "COMING SOON" label

#### Scenario: No kicker above the section title

- **WHEN** the coming-next section renders
- **THEN** the heading block contains the section title and its subtitle only, with no
  kicker line above the title

#### Scenario: Second IP uses its final name

- **WHEN** the coming-next section renders
- **THEN** the second card's name is `Butterfly Sprite` and the string `PSYCHE` does not appear

## MODIFIED Requirements

### Requirement: Hero carousel with landing links

The homepage hero SHALL be a 5-slide carousel (auto-advancing, swipeable) aligned to the
`网站头图.psd` UI tree, rendered as **live text** rather than baked title/subtitle images.
Slide 1 (brand group photo) shows the hand-written is.offy wordmark image (596×224 PSD vector
layer) centered near the top at y8.81% with the slogan below it at y21.6% (3.22cqw; the
English slogan uses an explicit two-line break), and is NOT clickable. Slide 2 is the promo
composite screen: the doll photo on the left, the bag photos to its right, and live promo
copy — a kicker at x12.25%/y51.35% and a title at x11.88%/y59.72% with `leading-[1.2]` and no
uppercase transform (so "OFFYs," keeps its lowercase s); it is NOT clickable. Slides 3-5 are
series screens: the subtitle at x6.4%/y64.51% (`clamp(11px, 2.46cqw, 36px)`) and the series
title at x6.4%/y71.2% (`clamp(18px, 6.91cqw, 100px)`, the same size for both locales since the
PSD supplies English copy) — the title's top is 71.2% on `lg` and above, and 73% below `lg` so
that the subtitle→title gap grows on narrow viewports while the title still clears the
progress indicator. The「查看详情」CTA SHALL sit in the same row as the subtitle, right-aligned
to the row's 93.6% edge and vertically centred on the subtitle (measured centre delta 0.00%
at every viewport), with height 2.6cqw (`min-h-[24px]`), font `clamp(9px, 1.24cqw, 18px)` and
`min-w-[15.35cqw]`. The fashion slide (slide 4) uses WHITE title/subtitle on its dark
full-bleed photo; other series slides use dark text on light. Slide controls SHALL be a
centered line indicator at y89.8% plus prev/next arrow buttons at the bottom-right using the
PSD arrow PNGs — sized `clamp(30px, 3.7cqw, 48px)` at y76.3% on `lg` and above, and
`clamp(20px, 2.7cqw, 38px)` at y84.8% below `lg` (the longest series title reaches 88% of the
width on narrow viewports, so arrows left at y76.3% would overlap it). Series slides MUST NOT
wrap the whole slide in an anchor (the CTA is the only navigation entry, avoiding nested
anchors). All hero text and images SHALL scale with viewport-relative clamp() constraints
(min/max caps) so that on narrow viewports text shrinks proportionally, wraps when too long,
and never overflows or clips.

#### Scenario: Series slide bottom-left title group
- **WHEN** the user browses to hero slide 3, 4 or 5 (公主lady / 时尚潮流生活 / 趣味生活)
- **THEN** the bottom-left shows the series title text at x6.4%/y71.2% (73% below `lg`) with
  the subtitle above it at x6.4%/y64.51% and a「查看详情」outlined CTA in that same row,
  right-aligned; the fashion slide renders them in white, others in dark ink

#### Scenario: Slide links to landing
- **WHEN** the user clicks the「查看详情」button on a series slide (3/4/5)
- **THEN** they navigate to the matching series collection page
  (`/collections/princess-lady` / `/collections/outdoor-sporty` / `/collections/playful-life`)

#### Scenario: CTA navigates to landing
- **WHEN** the user activates the「查看详情」CTA (click or keyboard) on a series slide
- **THEN** it is the only anchor in the slide and navigates to the matching series collection
  page (`/collections/princess-lady` / `/collections/outdoor-sporty` / `/collections/playful-life`)

#### Scenario: Non-linked slides
- **WHEN** the user taps hero slide 1 or 2
- **THEN** nothing happens (no navigation)

#### Scenario: Slide 1 text overlay
- **WHEN** slide 1 is active
- **THEN** the hand-written is.offy wordmark image renders centered near the top at y8.81%,
  with the slogan beneath it at y21.6%

#### Scenario: Slide 1 wordmark and slogan
- **WHEN** slide 1 renders
- **THEN** the 596×224 is.offy wordmark image shows centered at y8.81% of the hero area with
  the slogan at y21.6% (`clamp(16px, 3.22cqw, 105px)`) beneath it

#### Scenario: Slide 1 wordmark and one-line slogan
- **WHEN** slide 1 renders
- **THEN** the wordmark image is centered with a width of 15.78% of the hero and the slogan
  is centered beneath it; the Chinese slogan renders on one line and the English slogan on
  two lines via an explicit break rather than by wrapping

#### Scenario: No image cropping
- **WHEN** any slide renders on any viewport
- **THEN** the full photo is visible (`object-contain object-top`) on a backdrop matching the
  photo's edge color, and the hero keeps its PSD aspect ratio (3250/2041) at every width

#### Scenario: Promo composite screen
- **WHEN** slide 2 renders
- **THEN** the doll photo, the bag photos and the live promo copy (kicker at x12.25%/y51.35%,
  title at x11.88%/y59.72% with `leading-[1.2]`) render at their PSD-derived positions, and
  the title is not upper-cased

#### Scenario: Series slides show OFFY titles
- **WHEN** slides 3-5 render
- **THEN** each shows its series title as live text at x6.4%, at `clamp(18px, 6.91cqw, 100px)`
  with the same size in both locales

#### Scenario: Dark fashion slide readability
- **WHEN** slide 4 (时尚潮流生活) renders
- **THEN** its title, subtitle and CTA render in white over the dark photo and remain readable

#### Scenario: Arrow navigation
- **WHEN** the user clicks the next arrow
- **THEN** the carousel advances to the next slide; the prev arrow goes back, and both arrows
  render at the sizes and vertical positions defined for the current breakpoint

#### Scenario: Auto-advance
- **WHEN** the hero is visible and idle
- **THEN** slides advance automatically with a cross-fade transition

#### Scenario: Mobile proportional scaling
- **WHEN** the viewport is ≤768px wide
- **THEN** hero text shrinks proportionally within clamp() bounds, the series title drops to
  y73%, the arrows shrink and move to y84.8%, and neither the title nor the arrows overlap the
  progress indicator or each other

#### Scenario: CTA stays centred on the subtitle
- **WHEN** the hero renders at any viewport width, including 390px
- **THEN** the CTA's vertical centre equals the subtitle's vertical centre, and the CTA's
  `min-height` does not push the subtitle out of position

### Requirement: News module
The homepage SHALL render the news section with a single centred title line composed as
`{newsKicker}·{newsTitle}` ("News·The Latest from OFFY") and the "Browse all series" link as a
centred, underlined `link-line` **below that title**, outside the card grid. The grid keeps
one large feature card and four secondary cards, but every card's copy SHALL sit inside a
solid black pill positioned over the image at its bottom centre — the feature card's badge and
headline at the top centre with a pill CTA at `bottom-[10%]`, and each secondary card's pill
at `bottom-[8.4%]` — and the secondary cards MUST NOT render a caption below the image.

#### Scenario: News cards render
- **WHEN** the homepage renders
- **THEN** 1 feature card + 4 secondary cards render with images and localized titles, and
  each card's caption sits in a black pill over the image rather than below it

#### Scenario: Browse-all CTA
- **WHEN** the user clicks 逛全部系列 / "Browse all series"
- **THEN** they navigate to the products page, and the link is rendered once, centred beneath
  the section title rather than inside the card grid

### Requirement: Teaser section for upcoming series
The homepage SHALL render the teaser section with a centred title group above a full-bleed
panel. Per `更多新品，敬请期待.psd`, the small line `Stay tuned.` renders ABOVE the large
`Upcoming Releases` heading (36px ≈ 1.11vw and 102.2px ≈ 3.14vw respectively, both centred);
the oversized faded "Stay / tuned." watermark is baked into the background image and MUST NOT
be re-rendered. The panel keeps the teaser hero image as background with the left column
overlaying the series name, its note and a solid black pill 查看详情 button.

#### Scenario: Teaser renders
- **WHEN** the homepage renders
- **THEN** the centred title group shows the small `Stay tuned.` line above the large
  `Upcoming Releases` heading, the background hero image fills the panel, and the left overlay
  text and black pill CTA appear

### Requirement: Homepage renders brand content
The homepage SHALL present the is.offy™ brand (黑皮 OFFY · 37 个化身) with the
following section order: hero carousel → promo bar → news → shop by category
(centered title group + latest looks + regional-exclusive group + product-summary
roster) → upcoming series teaser → collab (14 OF looks) → future IPs → newsletter.
Brand copy uses "让想象落地，让陪伴发生" and "仪式感生活" messaging.
The collaboration section's call-to-action SHALL link to the current company domain
(`mailto:contact@whimcoreofficial.com`); the retired `playcoretoys.com` address MUST NOT
appear anywhere on the site.

#### Scenario: Visitor loads the homepage
- **WHEN** a visitor requests `/`
- **THEN** the server returns HTTP 200 with the hero carousel, merged category section, and newsletter section

#### Scenario: Category tiles link to category pages
- **WHEN** a visitor clicks a product card in the merged category section
- **THEN** they land on that product's detail page

#### Scenario: Regional-exclusive group
- **WHEN** the merged category section renders for a visitor in country X
- **THEN** after the latest-looks grid a 「区域限定」 group lists the products that are
  visible in X but not in every probed market — derived from Shopify Markets by re-running the
  same Storefront query under different `@inContext(country:)` contexts, not from hard-coded
  product codes — each card carrying a red badge reading `AVAILABLE IN <REGION> ONLY` for X;
  the whole group is hidden when X has no exclusive products

#### Scenario: Product-summary roster inside the category section
- **WHEN** the merged category section renders
- **THEN** after the regional group, a 「产品汇总-选购同款造型:」 label and the
  circular-avatar roster of all products appear; no separate roster section exists
  later on the page

#### Scenario: Brand sections are present
- **WHEN** the homepage renders
- **THEN** it contains a news section, a teaser section, a collab section, a newsletter section, and a contact footer

#### Scenario: Collaboration CTA uses the current domain
- **WHEN** the homepage renders
- **THEN** the collaboration call-to-action is a `mailto:` link to
  `contact@whimcoreofficial.com` and the rendered HTML contains no `playcoretoys.com`
