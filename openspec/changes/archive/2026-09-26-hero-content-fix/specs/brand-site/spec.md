## MODIFIED Requirements

### Requirement: Hero carousel with landing links
The homepage hero SHALL be a 5-slide carousel (auto-advancing, swipeable) matching
the design draft. Slides render the full image with `object-contain` centered on a
per-slide backdrop color sampled from the image edge (no cropping of the dolls).
Slide 1 (brand group photo, hero-01) shows the hand-written is.offy wordmark image
centered at the top with the slogan「让想象落地 让陪伴发生」below it, and is NOT
clickable. Slide 2 (promo photo, hero-05) shows the promo copy in bold black at the
bottom-left, and is NOT clickable. Slides 3-5 are clickable series photos showing
「OFFY + 系列名」 in bold black centered at the top: slide 3 (hero-02, 公主lady系列)
→ `/collections/princess-lady`; slide 4 (hero-04, 时尚潮流生活) →
`/collections/outdoor-sporty`; slide 5 (hero-03, 趣味生活系列) →
`/collections/playful-life`. Slide controls SHALL be a centered line-bar indicator
at the bottom plus dark prev/next arrow buttons at the bottom-right.

#### Scenario: Slide links to landing
- **WHEN** the user clicks hero slide 3, 4 or 5
- **THEN** they navigate to the matching series collection page

#### Scenario: Non-linked slides
- **WHEN** the user taps hero slide 1 or 2
- **THEN** nothing happens (no navigation)

#### Scenario: Slide 1 text overlay
- **WHEN** slide 1 is active
- **THEN** the hand-written is.offy wordmark image (not a system-font text) renders centered near the top, with the slogan「让想象落地 让陪伴发生」(spaced, no comma) beneath it

#### Scenario: Slide 1 wordmark and slogan
- **WHEN** slide 1 renders
- **THEN** the hand-written is.offy wordmark image shows centered at the top with the slogan beneath it

#### Scenario: Series slides show OFFY titles
- **WHEN** slides 3-5 render
- **THEN** each shows OFFY + its series name in bold black centered at the top

#### Scenario: No image cropping
- **WHEN** any slide renders on any viewport
- **THEN** the full photo is visible (object-contain) on a backdrop matching the photo's edge color

#### Scenario: Arrow navigation
- **WHEN** the user clicks the next arrow
- **THEN** the carousel advances to the next slide; the prev arrow goes back

#### Scenario: Auto-advance
- **WHEN** the hero is visible and idle
- **THEN** slides advance automatically with a cross-fade transition
