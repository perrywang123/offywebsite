## MODIFIED Requirements

### Requirement: Hero carousel with landing links
The homepage hero SHALL be a 4-slide carousel (auto-advancing, swipeable) matching
the PSD source file. Slide 1 (brand group photo, hero-01) shows the hand-written
is.offy wordmark image centered at the top with the slogan「让想象落地 让陪伴发生」
below it, and is NOT clickable. Slide 2 is the promo composite screen (rebuilt from
the PSD「头图-活动奖励」group): white background, the doll photo on the left, a 2×2
grid of four bag photos on the right, and the two-line promo copy「即日起，任意购买三个
公仔以上，送offy包包」in bold black at the bottom-left; it is NOT clickable. Slides
3-4 are clickable series photos showing「OFFY + 系列名」in bold black centered at the
top: slide 3 (hero-02, 公主lady系列) → `/collections/princess-lady`; slide 4
(hero-04, 时尚潮流生活) → `/collections/outdoor-sporty`. Slide controls SHALL be a
centered 4-bar line indicator at the bottom plus dark prev/next arrow buttons at the
bottom-right.

#### Scenario: Slide links to landing
- **WHEN** the user clicks hero slide 3 or 4
- **THEN** they navigate to the matching series collection page

#### Scenario: Non-linked slides
- **WHEN** the user taps hero slide 1 or 2
- **THEN** nothing happens (no navigation)

#### Scenario: Slide 1 text overlay
- **WHEN** slide 1 is active
- **THEN** the hand-written is.offy wordmark image renders centered near the top, with the slogan beneath it

#### Scenario: Slide 1 wordmark and slogan
- **WHEN** slide 1 renders
- **THEN** the hand-written is.offy wordmark image shows centered at the top with the slogan beneath it

#### Scenario: No image cropping
- **WHEN** any slide renders on any viewport
- **THEN** the full photo is visible (object-contain) on a backdrop matching the photo's edge color

#### Scenario: Promo composite screen
- **WHEN** slide 2 renders
- **THEN** the doll photo, the 2×2 grid of four bag photos, and the two-line promo copy render on a white background

#### Scenario: Series slides show OFFY titles
- **WHEN** slides 3-4 render
- **THEN** each shows OFFY + its series name in bold black centered at the top

#### Scenario: Arrow navigation
- **WHEN** the user clicks the next arrow
- **THEN** the carousel advances to the next slide; the prev arrow goes back

#### Scenario: Auto-advance
- **WHEN** the hero is visible and idle
- **THEN** slides advance automatically with a cross-fade transition
