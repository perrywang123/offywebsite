## ADDED Requirements

### Requirement: Narrow-viewport layout contract

Below the `lg` breakpoint (1024px) every page SHALL lay out against a single gutter
source: sixteen pixels of side margin at 375px (a 343px content column) and the
existing 92% `.container-site` width from `md` up, with no page-level container
re-declaring its own horizontal padding. Vertical section rhythm below 1024px SHALL
come from `.section-y` (48px at the base breakpoint, 80px from `md`), so the seam
between two adjacent sections is 96px instead of 160px. Reading-width caps (68ch /
`max-w-3xl` / `max-w-5xl` / `max-w-[38rem]`) SHALL live on an inner element, never as a
second gutter.

At 320px and 375px no route may scroll horizontally:
`document.documentElement.scrollWidth` SHALL equal `clientWidth`. The left edge of the
first `h1`, the header logo, the category tab strip and main content containers SHALL
be 16px at 375px.

#### Scenario: Zero horizontal overflow at 320 and 375

- **WHEN** each audited route (home, products, collection, PDP, cart, checkout,
  bag-charm, FAQ, policy, about) is loaded at 320px or 375px
- **THEN** `documentElement.scrollWidth === documentElement.clientWidth`

#### Scenario: One gutter, one left edge

- **WHEN** a route renders at 375px
- **THEN** its `h1`, the header logo, the category tab strip (inner container) and its
  main content container all report `getBoundingClientRect().left === 16`

#### Scenario: Section rhythm

- **WHEN** two `.section-y` sections are adjacent at 375px
- **THEN** their combined padding is 96px, and at 1024px and above the padding is
  exactly what the page used before this change

### Requirement: Readability floor

No visible text below 1024px SHALL render smaller than 11px, with no exceptions; body
copy SHALL not render below 12px, and interactive caps labels SHALL not render below
12px. Page `h1` elements SHALL be 36px at 375px, `section` `h2` lower bounds SHALL be
30px, and every `clamp()` / `max()` font size in `vw` or `cqw` units SHALL carry an
explicit lower bound so that narrow viewports cannot shrink text below the floor. The
absolute floor SHALL be enforced by a source-level assertion, not only by review.

#### Scenario: Secondary news captions at 375px

- **WHEN** the home news grid renders at 375px
- **THEN** its secondary-card captions measure at least 11px instead of the previous
  7.91px, and the copy still fits its pill

#### Scenario: Upcoming card floors

- **WHEN** an `UpcomingCard` renders below 640px
- **THEN** its three `clamp()` font sizes have lower bounds of 11px, 24px and 12px

#### Scenario: Source-level guard

- **WHEN** `pnpm test` runs
- **THEN** it fails if any non-test source file contains `text-[9px]`, `text-[10px]`,
  a bounded-less `text-[<number>cqw]`, a bare `py-3 -my-3`, a `max-w-*xl` paired with
  `px-*` on the same element, or a bare `h-8 w-8` / `h-9 w-9`

### Requirement: Touch target contract

Independent controls SHALL expose at least a 44×44px tappable area below the `lg`
breakpoint, measured as the region that actually routes a tap to that control
(pseudo-element expansions count, regions covered by another element do not).
Inline text links SHALL expose at least 44px of tappable height with width following
the text. Every control SHALL keep a tappable area of at least 24×24px at every
breakpoint. Above 1024px control sizes SHALL remain exactly as they were before this
change.

#### Scenario: Purchase path at 375px

- **WHEN** the PDP, the cart drawer, `/cart` or `/checkout` renders at 375px
- **THEN** no interactive element is smaller than 44×44px, counting pseudo-element
  hit-area expansions

#### Scenario: Hero indicator bars

- **WHEN** the home hero's 2.8px-tall indicator bars render at 375px
- **THEN** each bar's real tappable height (bar plus its upward `::after` extension)
  is at least 24px, while the painted bar keeps its PSD height

#### Scenario: Inline links keep their visual line box

- **WHEN** a breadcrumb, footer, FAQ or policy text link receives `.tap-target--quiet`
- **THEN** its tappable height is at least 44px and its surrounding layout is
  unchanged (the added padding is cancelled by an equal negative margin, and a
  `link-line` underline stays 2px below the text)

#### Scenario: Drawer exit paths

- **WHEN** the cart drawer is open at 375px
- **THEN** the ✕ control is at least 44×44px, at least 40px of clickable overlay
  remains to the left of the 88%-wide panel, the panel is `100dvh` tall with
  `env(safe-area-inset-*)` respected, and the page behind it cannot scroll

### Requirement: Safe-area and overlay viewport

The root layout SHALL export a `viewport` with `width: device-width`,
`initialScale: 1` and `viewportFit: "cover"`, and full-height overlays SHALL use
`100dvh` (falling back to `height: 100%` where `dvh` is unsupported) with
`.safe-b` / `.safe-t` padding so that content is never trapped under the browser
toolbar or the home indicator.

#### Scenario: Drawer footer clearance

- **WHEN** the cart drawer renders on a device with a home indicator
- **THEN** its footer's computed bottom padding is at least
  `1rem + env(safe-area-inset-bottom)` and the Checkout button's lower edge sits at
  least 24px above the viewport bottom

#### Scenario: Overlay scroll lock

- **WHEN** the cart drawer or the bag-charm quick view is open
- **THEN** `document.documentElement` has `overflow: hidden`, and the previous inline
  value is restored when it closes

### Requirement: Horizontal scroller pattern

Horizontal strips (category tabs, PDP thumbnails, product galleries) SHALL use
`.hscroll`: flex layout, `overflow-x: auto` with `overscroll-behavior-x: contain`,
scroll snapping, a hidden scrollbar, and a 12px fade at both edges **only below
1024px**. The active category tab SHALL be scrolled into view horizontally
(`inline: "center"`) without moving the page vertically (`block: "nearest"`).

#### Scenario: Category strip at 375px

- **WHEN** `/collections/playful-life` loads at 375px
- **THEN** the active tab is fully inside the viewport, the strip scrolls
  horizontally with snapping, and `window.scrollY` is still 0

#### Scenario: Reduced motion

- **WHEN** `prefers-reduced-motion: reduce` is set
- **THEN** the promo marquee renders as a wrapped static block with its copy fully
  readable and the duplicated loop copy hidden

### Requirement: Header height and sticky offsets

The header SHALL publish its measured height into the `--header-h` custom property on
`<html>` (via `ResizeObserver`), so sticky elements positioned from that variable
follow the promo bar as its copy wraps, and the `globals.css` values remain as the
initial estimate for the pre-hydration paint.

#### Scenario: Promo rotation does not cover the tab bar

- **WHEN** the header's promo message changes length and the header grows
- **THEN** `--header-h` equals the measured header height, and the sticky category tab
  bar's top edge stays at or below the header's bottom edge

## MODIFIED Requirements

### Requirement: Sticky category tab bar

Catalog and collection pages SHALL render a horizontally-scrollable category tab bar
that sticks below the header while scrolling, with the active category bold. Below
1024px each tab SHALL expose at least 44px of tappable height while the strip's
desktop height is unchanged. The collection page hero SHALL display the series' own
hero image (`series.heroImage`) with the Ken Burns entrance.

#### Scenario: Following scroll
- **WHEN** the visitor scrolls a collection page
- **THEN** the category tab bar remains visible directly below the header

#### Scenario: Series hero shows the series hero image
- **WHEN** a collections page renders
- **THEN** the hero shows that series' dedicated hero image, not a product photo

#### Scenario: Tabs are tappable below 1024px
- **WHEN** the tab strip renders at 375px
- **THEN** every tab's tappable height is at least 44px, the strip scrolls
  horizontally with snapping and a hidden scrollbar, and at 1024px and above the tab
  geometry matches the pre-change rendering

### Requirement: Keyboard focus visibility

Every textual link in the site SHALL expose a visible focus indicator for keyboard users,
using `:focus-visible` with an outline that is not clipped by `overflow` or `border-radius`.
On the dark footer the outline SHALL use the on-dark accent colour; on light pages it SHALL
use the ink colour. Because touch devices have no hover state, every `link-line` text link
SHALL additionally expose a pressed (`:active`) state in which its underline collapses,
so that a tap produces immediate visible feedback.

#### Scenario: Footer links show a focus ring

- **WHEN** a footer link receives keyboard focus
- **THEN** it renders a visible outline offset from the text rather than the browser default
  or no indicator at all

#### Scenario: Pressed state without hover

- **WHEN** an inline `link-line` link is pressed on a touch device
- **THEN** its underline collapses, giving immediate feedback without a hover state
