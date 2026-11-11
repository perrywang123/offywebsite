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
