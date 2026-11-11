## ADDED Requirements

### Requirement: Desktop NEWS feature CTA proportions

At the desktop NEWS grid breakpoint of 1024px, the feature VIEW DETAILS capsule SHALL grow proportionally with its card up to 320px wide, use 52–64px height and 18–24px text, remain horizontally centered and clear of the photograph's Limited artwork. Below this breakpoint it SHALL retain the existing 40% width, 176px cap, 40–48px height and 12–16px text. Existing editorial images, secondary card capsules, product binding and whole-card link SHALL remain unchanged.

#### Scenario: Desktop feature at 1440px

- **WHEN** the viewport is 1440px wide and the NEWS grid renders
- **THEN** the feature capsule is at least 240px wide, larger than the previous 176px cap, centered and legible without covering the Limited artwork

#### Scenario: Compact mobile feature retained

- **WHEN** the NEWS grid renders on a 390px phone
- **THEN** the feature capsule keeps its previous approximately 143px width and 40px height, preserving its position and product link
