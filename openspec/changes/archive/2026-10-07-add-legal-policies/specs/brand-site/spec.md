## ADDED Requirements

### Requirement: Footer policy entry points

The footer's fourth column SHALL be a navigation group headed by the
`common.footer.policiesHeading` translation, listing the five policy pages as links in the
order returns → privacy → terms → shipping → contact, with `href` exactly
`/{locale}/policies/{handle}`. The former hard-coded CONTACT column (the
`hello@playcoretoys.com` address and the Xiaohongshu handle) SHALL be removed, and no page in
the site may reference the `playcoretoys.com` domain. The policy group SHALL use the same
kicker, link size, tracking and hover treatment as the existing MENU and COLLECTIONS groups,
and the group's `<nav>` SHALL carry an `aria-label`. The footer grid SHALL use two columns
from the `md` breakpoint and four columns only from `lg` — at 768–1023px the container is
about 707px wide, so four columns leave roughly 150px each, less than the 320px the brand
blurb's own `max-w-xs` implies.

#### Scenario: Footer exposes exactly the five policy links

- **WHEN** any page renders its footer
- **THEN** exactly five anchors match `/{locale}/policies/{handle}` and their `handle` values
  are `returns`, `privacy`, `terms`, `shipping`, `contact` in that order

#### Scenario: Stale contact details are gone

- **WHEN** any page's HTML is inspected
- **THEN** it does not contain `playcoretoys.com`, and the footer no longer contains the
  Xiaohongshu handle

### Requirement: Keyboard focus visibility

Every textual link in the site SHALL expose a visible focus indicator for keyboard users,
using `:focus-visible` with an outline that is not clipped by `overflow` or `border-radius`.
On the dark footer the outline SHALL use the on-dark accent colour; on light pages it SHALL
use the ink colour.

#### Scenario: Footer links show a focus ring

- **WHEN** a footer link receives keyboard focus
- **THEN** it renders a visible outline offset from the text rather than the browser default
  or no indicator at all
