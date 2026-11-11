## ADDED Requirements

### Requirement: Responsive brand slide clear space

The homepage brand slide SHALL retain its approved original logo, English copy and full seven-character photographic row. Brand copy SHALL be larger and readable on narrow screens, with a distinct primary and secondary line. Text and photography SHALL occupy non-overlapping normal-flow regions. Wrapped or enlarged text SHALL expand the layout instead of covering the photographed characters. The carousel frame SHALL accommodate its contents without jumping between slides, and the other four slides SHALL preserve their existing copy and photographic proportions.

#### Scenario: Mobile text expands

- **WHEN** the brand slide is viewed at 320px width or the text is enlarged to 200%
- **THEN** the full copy and all seven OFFYs remain visible without overlap or horizontal overflow

#### Scenario: Desktop proportion

- **WHEN** desktop content fits the original banner proportion
- **THEN** the brand slide retains that overall proportion with larger primary copy and a subordinate tagline

#### Scenario: Carousel changes slides

- **WHEN** a shopper changes between any of the five slides
- **THEN** the frame height remains stable and existing swipe, link and indicator interactions remain available

### Requirement: Unclipped promo and series copy

Promo and series slides SHALL retain their original English copy and complete photographed subjects. The promo SHALL allow its existing two semantic title segments to wrap onto additional lines without clipping. Mobile series subtitles SHALL remain readable, and all text SHALL occupy normal-flow space separate from photography. Each layout SHALL reserve space for the shared indicators. Enlarged text SHALL increase the common frame height rather than cover subjects or indicators.

#### Scenario: Promo title wraps further

- **WHEN** the text size or font metrics make GET A FREE BIG TOTE wrap to an additional line
- **THEN** TOTE remains completely visible and the photo, text and indicators do not overlap

#### Scenario: Mobile series readability

- **WHEN** a shopper views the Princess, Streetwear or Dress-up slide on a narrow screen
- **THEN** the existing left-aligned primary title and subtitle remain complete, with mobile subtitles at least 12px in the default style
