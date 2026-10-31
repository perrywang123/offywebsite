## ADDED Requirements

### Requirement: Hero slides are fully clickable

Every homepage hero slide SHALL route a tap (or click, or Enter on a focused slide) to its own
landing destination across the whole slide area, with no dead region: the slide content is
wrapped in a single screen-wide anchor (`absolute inset-0`) whose accessible name comes from
the slide's own live copy (slide 1's slogan, slide 2's promo copy, slides 3-5's series title) —
no extra `aria-label` key is invented for it. The destinations SHALL be slide 1 → `/about`,
slide 2 → `/products`, slide 3 → `/collections/princess-lady`, slide 4 →
`/collections/outdoor-sporty`, slide 5 → `/collections/playful-life`. The「查看详情」CTA and
the prev/next arrows SHALL NOT be rendered by default, so a slide never contains a second,
nested anchor; the screen-wide anchor and the CTA are mutually exclusive by construction (one
constant drives both branches). Swipe is the only gesture that changes the active slide without
navigating; the five indicator tabs are the always-available controls and they are not
affected by the CTA/arrow switches.

#### Scenario: All five slides are screen-wide links

- **WHEN** the homepage hero renders
- **THEN** exactly five anchors render, one per slide, with `href` values `/about`,
  `/products`, `/collections/princess-lady`, `/collections/outdoor-sporty` and
  `/collections/playful-life`, each covering its slide's full area — the CTA and arrow
  switches do not change this count

#### Scenario: The brand and promo slides navigate too

- **WHEN** the visitor taps hero slide 1 or slide 2 (anywhere in the slide)
- **THEN** they navigate to `/about` or `/products` respectively — the earlier behaviour of
  "nothing happens" is retired

#### Scenario: No slide nests an anchor

- **WHEN** any hero slide renders, with the CTA switches at their defaults
- **THEN** the slide contains no anchor inside an anchor, and the CTA and arrow controls are
  absent from the DOM rather than merely hidden

## MODIFIED Requirements

### Requirement: Homepage renders brand content

The homepage SHALL present the is.offy™ brand (黑皮 OFFY · 37 个化身) with the
following section order: hero carousel → news → shop by category
(centered title group + latest looks + regional-exclusive group + product-summary
roster) → upcoming series teaser → collab (14 OF looks) → future IPs → newsletter.
The scrolling promo bar that used to sit directly under the hero is removed and MUST
NOT be restored; the header's own sticky promo announcement bar remains the site's
single promo surface.
Brand copy uses "让想象落地，让陪伴发生" and "仪式感生活" messaging.
The collaboration section's call-to-action SHALL link to the current company domain
(`mailto:contact@whimcoreofficial.com`); the retired `playcoretoys.com` address MUST NOT
appear anywhere on the site.

#### Scenario: Visitor loads the homepage
- **WHEN** a visitor requests `/`
- **THEN** the server returns HTTP 200 with the hero carousel, merged category section, and newsletter section

#### Scenario: No scrolling promo bar
- **WHEN** the homepage renders, at any viewport
- **THEN** no element renders between the hero and the news section (the hero's bottom border
  is the only thing separating them), no marquee track element exists in the DOM, and the
  header's promo announcement bar is still present with non-empty copy

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

### Requirement: Hero carousel with landing links

The homepage hero SHALL be a 5-slide carousel (auto-advancing, swipeable) aligned to the
`网站头图.psd` UI tree, rendered as **live text** rather than baked title/subtitle images.
Slide 1 (brand group photo) shows the hand-written is.offy wordmark image (596×224 PSD vector
layer) centered near the top at y8.81% with the slogan below it at y21.6% (3.22cqw; the
English slogan uses an explicit two-line break). Slide 2 is the promo
composite screen: the doll photo on the left, the bag photos to its right, and live promo
copy — a kicker at x12.25%/y51.35% and a title at x11.88%/y59.72% with `leading-[1.2]` and no
uppercase transform (so "OFFYs," keeps its lowercase s). Slides 3-5 are
series screens: the subtitle at x6.4%/y64.51% (`clamp(11px, 2.46cqw, 36px)`) and the series
title at x6.4%/y71.2% (`clamp(18px, 6.91cqw, 100px)`, the same size for both locales since the
PSD supplies English copy) — the title's top is 71.2% on `lg` and above, and 73% below `lg` so
that the subtitle→title gap grows on narrow viewports while the title still clears the
progress indicator. The fashion slide (slide 4) uses WHITE title/subtitle on its dark
full-bleed photo; other series slides use dark text on light.

The「查看详情」CTA and the prev/next arrows SHALL be **switch-controlled and not rendered by
default** (`SHOW_HERO_DETAILS_CTA` / `SHOW_HERO_ARROWS`, both `false`). They are not deleted:
their geometry, copy and i18n key (`home.heroDetailsCta`) are kept so flipping a constant
restores them. They MUST NOT be left in the DOM behind `hidden`/`sr-only`, for two reasons:
a CSS-hidden control is still focusable (a WCAG 2.4.7 counter-example), and an `<a>` inside
the screen-wide anchor is invalid HTML whose parser repair produces a hydration mismatch —
which is why the CTA branch and the screen-wide-link branch are driven by the same constant
and can never both be active.

The CTA, when enabled, sits in the same row as the subtitle, right-aligned
to the row's 93.6% edge and vertically centred on the subtitle (measured centre delta 0.00%
at every viewport), with height 2.6cqw (`min-h-[44px]` below `lg`, the PSD 2.6cqw height at
`lg` and above), font `clamp(12px, 1.24cqw, 18px)` and `min-w-[15.35cqw]`; its vertical centre
SHALL equal the subtitle's centre at every viewport so that its hit-area expansion never pushes
the subtitle out of position.

The slide controls SHALL be a centered line indicator at y89.8%. The prev/next arrow buttons
(PSD arrow PNGs at the bottom-right, `clamp(30px, 3.7cqw, 48px)` at y76.3% on `lg` and
`clamp(20px, 2.7cqw, 38px)` at y84.8% below it) are the switch-controlled controls described
above and MUST NOT render by default; the same applies to the artifact they caused — with no
arrows below them, the indicator bars' upward `::after` extension grows by 0.15rem
(`calc(100% + 2.65rem)` instead of `calc(100% + 2.5rem)`), so each bar routes at least 44px of
tap height at 375px while its painted height stays at the PSD value. Series slides MUST NOT
wrap the whole slide in an anchor while the CTA is rendered (the CTA is then the only
navigation entry, avoiding nested anchors); with the CTA off — the default — every slide,
including the series slides, IS wrapped in the screen-wide anchor defined by "Hero slides are
fully clickable". All hero text and images SHALL scale with viewport-relative clamp() constraints
(min/max caps) so that on narrow viewports text shrinks proportionally, wraps when too long,
and never overflows or clips.

#### Scenario: Series slide bottom-left title group
- **WHEN** the user browses to hero slide 3, 4 or 5 (公主lady / 时尚潮流生活 / 趣味生活)
- **THEN** the bottom-left shows the series title text at x6.4%/y71.2% (73% below `lg`) with
  the subtitle above it at x6.4%/y64.51% and no「查看详情」CTA beside it, since that CTA is
  not rendered by default; the fashion slide renders the copy in white, others in dark ink

#### Scenario: Slide links to landing
- **WHEN** the user taps anywhere on hero slide 3, 4 or 5
- **THEN** the slide's screen-wide anchor navigates to the matching series collection page
  (`/collections/princess-lady` / `/collections/outdoor-sporty` / `/collections/playful-life`)

#### Scenario: CTA navigates to landing
- **WHEN** the「查看详情」CTA switch is on and the user activates the CTA (click or keyboard) on a series slide
- **THEN** it is the only anchor in the slide and navigates to the matching series collection
  page (`/collections/princess-lady` / `/collections/outdoor-sporty` / `/collections/playful-life`);
  with the switch at its default the CTA is absent and the screen-wide anchor is the only
  navigation entry

#### Scenario: Non-linked slides
- **WHEN** the user taps hero slide 1 or 2
- **THEN** they navigate to `/about` or `/products` respectively — these two slides are
  screen-wide links like the rest, so nothing on the hero is inert

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
- **THEN** its title and subtitle render in white over the dark photo and remain readable

#### Scenario: Arrow navigation
- **WHEN** the homepage hero renders with the arrow switch at its default
- **THEN** no `heroPrevSlide` / `heroNextSlide` button is in the DOM and the arrow PNGs are
  not requested, so the arrows come back — at the sizes and vertical positions defined for
  each breakpoint — only by turning the switch on; the indicator tabs, the auto-advance and
  touch swipe keep changing slides with the arrows gone

#### Scenario: Auto-advance
- **WHEN** the hero is visible and idle, and the visitor has not paused it
- **THEN** slides advance automatically with a cross-fade transition

#### Scenario: Mobile proportional scaling
- **WHEN** the viewport is ≤768px wide
- **THEN** hero text shrinks proportionally within clamp() bounds, the series title drops to
  y73%, and the title stays clear of the progress indicator; if the arrow switch is on, the
  arrows also shrink to 2.7cqw and move to y84.8% so that they overlap neither the title nor
  the indicator

#### Scenario: CTA stays centred on the subtitle
- **WHEN** the hero renders at any viewport width, including 390px
- **THEN** the CTA's vertical centre equals the subtitle's vertical centre, and the CTA's
  `min-height` does not push the subtitle out of position

### Requirement: News module
The homepage SHALL render the news section on an explicitly declared flat background
(`bg-[#efefef]`, the colour sampled from the retired `news-bg.jpg`) rather than inheriting it
from a cascade side effect, and MUST NOT re-introduce that background image. The section
SHALL render a single centred title line from `home.newsTitle` alone (`The Latest from OFFY`
in English; the Chinese dictionary keeps its own line) — the `newsKicker` prefix (`News·` /
`资讯·`) is retired, and the `home.newsKicker` i18n key stays in both dictionaries but is no
longer rendered — with the "Browse all series" link as a centred, underlined `link-line`
**below that title**, outside the card grid. The grid keeps one large feature card and four
secondary cards, but every card's copy SHALL sit inside a solid black pill positioned over the
image at its bottom centre — the feature card's headline at the top centre with a pill CTA at
`bottom-[10%]`, and each secondary card's pill at `bottom-[8.4%]` — and the secondary cards
MUST NOT render a caption below the image. The feature card MUST NOT render a `NEW ARRIVALS`
badge: deleting it would have dragged the headline up by the badge's own height, so the
headline's top margin absorbs that space and the headline's position measured against the
pre-change baseline MUST stay within ±2px.

#### Scenario: News cards render
- **WHEN** the homepage renders
- **THEN** 1 feature card + 4 secondary cards render with images and localized titles, and
  each card's caption sits in a black pill over the image rather than below it

#### Scenario: Feature card headline without a badge
- **WHEN** the feature card renders
- **THEN** the string `NEW ARRIVALS` / `新品上市` does not appear inside it, its headline
  (e.g. `ROMANTICIZING EVERYDAY LIFE`) still renders at the top centre, and the headline's
  offset from the card's top edge matches the pre-change baseline within 2px at both 375px
  and 1440px

#### Scenario: Kicker prefix is gone
- **WHEN** the news section title renders in either locale
- **THEN** its text equals `home.newsTitle` with no `News·` / `资讯·` prefix in front of it,
  and `ProductCard`'s own `New in` corner badge elsewhere on the page is unaffected

#### Scenario: Browse-all CTA
- **WHEN** the user clicks 逛全部系列 / "Browse all series"
- **THEN** they navigate to the products page, and the link is rendered once, centred beneath
  the section title rather than inside the card grid

### Requirement: Teaser section for upcoming series
The homepage SHALL render the teaser section with a centred title group above a full-bleed
panel, on an explicitly declared flat background (`bg-[#f7f7f9]`, the colour sampled from the
retired `upcoming-bg.jpg`) rather than a background image, and the retired image MUST NOT be
re-introduced. Per `更多新品，敬请期待.psd`, the small line `Stay tuned.` renders ABOVE the large
`Upcoming Releases` heading (36px ≈ 1.11vw and 102.2px ≈ 3.14vw respectively, both centred).
The oversized faded "Stay / tuned." watermark used to be baked into that background image, so
it MUST NOT appear anywhere in the section — neither as an image nor re-rendered as live text;
the title group itself stays live text. The panel keeps the teaser hero image as background
with the left column overlaying the series name, its note and a solid black pill 查看详情
button.

#### Scenario: Teaser renders
- **WHEN** the homepage renders
- **THEN** the centred title group shows the small `Stay tuned.` line above the large
  `Upcoming Releases` heading, the teaser hero image fills the panel, the section reports
  `backgroundColor: rgb(247, 247, 249)` with `bg-[#f7f7f9]` in its class list, and the left
  overlay text and black pill CTA appear

#### Scenario: The watermark is gone in both forms
- **WHEN** the teaser section renders and the homepage's network requests are inspected
- **THEN** no `upcoming-bg` / `news-bg` / `category-bg` request is made (including
  `/_next/image?url=…` encoded forms), and no oversized faded `STAY / TUNED.` lettering is
  rendered as text

### Requirement: Footer policy entry points

The footer's fourth column SHALL be a **HELP & SUPPORT** navigation group headed by the
`common.footer.policiesHeading` translation and carrying an `aria-label`, holding two
top-level entry points — FAQ (`/faq`) and CONTACT US (`/policies/contact`) — followed by a
hairline divider and, below it, a deliberately weaker second-tier entry, LEGAL & POLICIES,
linking to the policy index (`/policies`) rather than to each policy page. The four policy
pages are reached through that index, not from the footer directly.

FAQ and CONTACT US SHALL be typographically identical to the existing MENU and COLLECTIONS
links — same font size (12px), same weight, same tracking, same colour tier, same left edge —
and their tappable height SHALL be at least 44px without changing the visual line box (the
`.tap-target--quiet` padding is cancelled by an equal negative margin). LEGAL & POLICIES SHALL
keep one weaker tier (`text-cream/50` on the ink footer, ≈5.21:1, still AA) and MUST NOT be
pressed darker: `text-cream/40` measures ≈3.8:1 and would fail AA. Its divider MUST stay.

The former hard-coded CONTACT column (the `hello@playcoretoys.com` address and the
Xiaohongshu handle) SHALL be removed, and no page in the site may reference the
`playcoretoys.com` domain. The footer grid SHALL use two columns
from the `md` breakpoint and four columns only from `lg` — at 768–1023px the container is
about 707px wide, so four columns leave roughly 150px each, less than the 320px the brand
blurb's own `max-w-xs` implies.

#### Scenario: Footer exposes exactly the five policy links

- **WHEN** any page renders its footer
- **THEN** the HELP & SUPPORT group contains exactly three anchors — `/faq`,
  `/policies/contact` and `/policies` — and it does not list the five individual policy pages
  (`returns`, `privacy`, `terms`, `shipping`, `contact`), which are reached through the
  `/policies` index instead; this supersedes the earlier "exactly five `/{locale}/policies/{handle}`
  anchors in the footer" contract

#### Scenario: FAQ and CONTACT US match the MENU links

- **WHEN** the footer renders at 1440px
- **THEN** the first MENU link, the first COLLECTIONS link and FAQ report the same computed
  `fontSize`, `fontWeight`, `fontFamily`, `letterSpacing` and `color`, and their
  `getBoundingClientRect().left` values differ by at most 1px, with zero left padding and
  zero left margin on each link

#### Scenario: Legal stays one tier lighter and still passes AA

- **WHEN** the footer renders
- **THEN** LEGAL & POLICIES renders with the `text-cream/50` tier (a lower alpha than the
  FAQ/CONTACT US tier), its computed contrast against the `#1d1915` footer is at least 4.5:1,
  and the divider element above it is still present

#### Scenario: Stale contact details are gone

- **WHEN** any page's HTML is inspected
- **THEN** it does not contain `playcoretoys.com`, and the footer no longer contains the
  Xiaohongshu handle

### Requirement: Touch target contract

Independent controls SHALL expose at least a 44×44px tappable area below the `lg`
breakpoint, measured as the region that actually routes a tap to that control
(pseudo-element expansions count, regions covered by another element do not).
Inline text links SHALL expose at least 44px of tappable height with width following
the text. Every control SHALL keep a tappable area of at least 24×24px at every
breakpoint. Above 1024px control sizes SHALL remain exactly as they were before this
change. The hero's indicator bars SHALL meet the same 44px floor as any other independent
control below `lg` — they are, with the arrows not rendered, one of only two ways to change
the slide by hand (the other being swipe) — while their painted height stays at the PSD value.

#### Scenario: Purchase path at 375px

- **WHEN** the PDP, the cart drawer, `/cart` or `/checkout` renders at 375px
- **THEN** no interactive element is smaller than 44×44px, counting pseudo-element
  hit-area expansions

#### Scenario: Hero indicator bars

- **WHEN** the home hero's 2.8px-tall indicator bars render at 375px with the arrow switch
  off (the default)
- **THEN** each bar's real tappable height (bar plus its upward `::after` extension, which
  grows by 0.15rem now that no arrow sits below it) is at least 44px — measured ≈45.2px —
  while the painted bar keeps its PSD height

#### Scenario: Inline links keep their visual line box

- **WHEN** a breadcrumb, footer, FAQ or policy text link receives `.tap-target--quiet`
- **THEN** its tappable height is at least 44px and its surrounding layout is
  unchanged (the added padding is cancelled by an equal negative margin, and a
  `link-line` underline stays 2px below the text)

#### Scenario: Drawer exit paths

- **WHEN** the cart drawer is open at 375px
- **THEN** the ✕ control is at least 44×44px, at least 40px of clickable overlay
  remains to the left of the 88%-wide panel, the panel is `100dvh` tall with
  `env(safe-area-inset-*)` respected, and the page behind it cannot scroll

### Requirement: Horizontal scroller pattern

Horizontal strips (category tabs, PDP thumbnails, product galleries) SHALL use
`.hscroll`: flex layout, `overflow-x: auto` with `overscroll-behavior-x: contain`,
scroll snapping, a hidden scrollbar, and a 12px fade at both edges **only below
1024px**. The active category tab SHALL be scrolled into view horizontally
(`inline: "center"`) without moving the page vertically (`block: "nearest"`). The
homepage's scrolling promo marquee is removed from the site, so this pattern covers the
remaining strips only and no marquee variant is specified.

#### Scenario: Category strip at 375px

- **WHEN** `/collections/playful-life` loads at 375px
- **THEN** the active tab is fully inside the viewport, the strip scrolls
  horizontally with snapping, and `window.scrollY` is still 0

#### Scenario: Reduced motion

- **WHEN** `prefers-reduced-motion: reduce` is set and a page with `.hscroll` strips renders
- **THEN** the strips keep their horizontal scrolling, snapping and hidden scrollbar without
  any animated reveal, and the site renders no promo marquee (the component is deleted, so
  there is no marquee-specific reduced-motion branch left to honour)

## REMOVED Requirements

### Requirement: Arrow navigation
The homepage hero's prev/next arrow buttons are no longer rendered by default
(`SHOW_HERO_ARROWS = false`), along with the call-to-action they shared the control layer
with, so this scenario has no landing point.

**Reason**: 老板 2026-10-12 诉求 1 —— 头图隐藏「查看详情」与左右箭头。该 scenario 是
scenario 级移除，而 openspec 的 REMOVED 以整条 requirement 为单位，因此这里只登记
**移除意图**，归档时会被判为「not in the current spec; treating it as already removed」
并跳过（warn，不是 error）；`Arrow navigation` 的实际内容收口在
`Hero carousel with landing links` 的 MODIFIED 块里（同名 scenario 已重写为「箭头不渲染」
的断言）。取舍的理由见 `design.md` 决策 D2。
