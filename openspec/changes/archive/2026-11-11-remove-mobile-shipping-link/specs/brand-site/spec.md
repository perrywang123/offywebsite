## MODIFIED Requirements

### Requirement: Header behavior

The Header SHALL be sticky with a solid light navigation background and black text, with rotating promo copy above it. Desktop navigation appears from 768px; mobile navigation opens below that breakpoint. Below 768px the white toolbar SHALL be a single compact row with a logo, country-code control, icon-only bag with count and menu; bag and menu hit areas SHALL remain at least 44px. The mobile drawer SHALL retain the four primary links and Shopify-supplied series links, display series without surrounding or per-row borders, and include only FAQ and Contact Us in Help & Support. The Shipping & returns policy-index link SHALL NOT appear in the mobile drawer. The drawer country control, footer and existing policy pages SHALL remain available. Desktop bag presentation SHALL retain its text capsule. ResizeObserver SHALL publish actual header height to --header-h for sticky category offsets.

#### Scenario: Promo wraps

- **WHEN** a promo message changes header height
- **THEN** the published height follows the element and category tabs remain offset beneath it

#### Scenario: Mobile actions and help

- **WHEN** a mobile shopper opens the bag, country selector or menu
- **THEN** the existing actions still work, and a help or navigation link closes the menu before opening its existing site destination

#### Scenario: Two sidebar help entries

- **WHEN** the mobile sidebar opens
- **THEN** Help & Support shows FAQ linking to /faq and Contact Us linking to /policies/contact, without Shipping & returns or a sidebar link to /policies
