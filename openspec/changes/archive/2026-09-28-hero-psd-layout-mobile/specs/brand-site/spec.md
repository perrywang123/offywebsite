## MODIFIED Requirements

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
