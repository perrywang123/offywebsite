## MODIFIED Requirements

### Requirement: Hero carousel with landing links
The homepage hero SHALL be a 5-slide carousel (auto-advancing, swipeable) matching
the design draft: slide 1 (brand group photo) shows the is.offy™ wordmark and
slogan centered at the top and is NOT clickable; slide 2 (promo photo) shows the
promo copy at the bottom-left and is NOT clickable; slides 3-5 (series photos)
are clickable, navigating to `/collections/princess-lady`, `/collections/outdoor-sporty`,
`/collections/playful-life` respectively. Slide controls SHALL be a centered line-bar
indicator at the bottom plus dark prev/next arrow buttons at the bottom-right.
No CTA buttons or extra copy overlay the hero beyond the per-slide text.

#### Scenario: Slide links to landing
- **WHEN** the user clicks hero slide 3, 4 or 5
- **THEN** they navigate to the matching series collection page

#### Scenario: Non-linked slides
- **WHEN** the user taps hero slide 1 or 2
- **THEN** nothing happens (no navigation)

#### Scenario: Slide 1 text overlay
- **WHEN** slide 1 is active
- **THEN** the is.offy™ wordmark and slogan render centered near the top of the hero

#### Scenario: Arrow navigation
- **WHEN** the user clicks the next arrow
- **THEN** the carousel advances to the next slide; the prev arrow goes back

#### Scenario: Auto-advance
- **WHEN** the hero is visible and idle
- **THEN** slides advance automatically with a cross-fade transition
