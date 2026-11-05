## ADDED Requirements

### Requirement: Consistent administrator workspace usability

The five management sections SHALL use visible associated labels, consistent readable controls, responsive content boundaries and keyboard-accessible actions. Active filters SHALL offer a current-section reset; invalid date ranges SHALL identify the error rather than appear as a legitimate empty result. Empty datasets and zero search matches SHALL have distinct actionable states. Modal forms SHALL keep the header, scrollable body and normal-flow action footer separate so fields and submit actions do not overlap on mobile; native validation, Escape and focus restoration SHALL remain available. Confirmation of consequential operations SHALL show the existing target identity and applicable amount/currency without changing financial authorization or business rules. Narrow-screen records SHALL retain field labels, amounts and actions, and any necessary horizontal scrolling SHALL be contained and identified rather than overflowing the whole page. Layout refinements SHALL preserve Shopify authority, currency separation, immutable history, session-only attribution, optional Admin connectivity and persistent navigation.

#### Scenario: Order filters on desktop and mobile

- **WHEN** an administrator filters orders using KOL, currency, status and payment dates
- **THEN** every control has a visible label and consistent sizing, invalid date order is explained and the current filters can be cleared

#### Scenario: Search finds no coupon or settlement

- **WHEN** existing data is filtered to zero matches
- **THEN** the section shows an explicit no-match explanation and a reset action rather than only empty table headers

#### Scenario: Mobile cooperation or financial confirmation

- **WHEN** an administrator scrolls a modal form or confirms a consequential action on a narrow viewport
- **THEN** all fields and the full action button remain reachable without footer overlap and the relevant target is visible before submitting
