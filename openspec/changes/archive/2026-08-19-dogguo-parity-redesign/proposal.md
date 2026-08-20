## Why

The current Offy site was modeled on dogguo.com but falls short of the reference
in four areas the owner called out (with reference screenshots 1–5):

1. The header lacks the sub-tab row and the scroll-following category tab bar
   (screenshots 1 & 2).
2. The homepage lacks a "Shop your category" part whose tiles link to a category
   landing page selling that category's products (screenshot 3).
3. The core-product part is cramped; the reference uses full-bleed, premium
   large imagery (screenshot 4).
4. The footer does not showcase the company wordmark as a full-width signature
   (screenshot 5).

Beyond structure, the reference's perceived quality comes from its motion
system (1.5s Ken Burns hero, 400ms header slide-in, 500ms image cross-fades,
hover slide-up info bars) and its full-screen, one-part-per-screen rhythm.

## What Changes

- Rebuild the header as a fixed bar with a promo strip, a scroll-triggered
  white background that slides in (translate-y, 400ms), and a Shop mega-menu
  listing categories.
- Add a sticky, horizontally-scrollable category sub-tab bar on catalog /
  collection pages that follows the user while scrolling (active item bold).
- Add a "Shop your category" homepage part: a 6-column tight-gap image grid
  (aspect 4/5, label overlaid at bottom, hover scale 1.01→1.05 in 500ms) where
  each tile links to its category landing page.
- Rebuild the core-product part as a full-bleed, full-height editorial block:
  large image, bottom-left oversized title, outlined CTA button.
- Rebuild the footer with a full-width wordmark signature (fluid SVG-style
  lettering spanning the container width) above the link columns.
- Upgrade the motion system: hero Ken Burns (1.5s), per-part reveal variants
  (fade / slide / clip), hover cross-fade product imagery, and slide-up info
  bars on product cards.
- Keep every part roughly one viewport tall on desktop ("one part per screen")
  with scroll-triggered entrance animations.

## Capabilities

### Modified Capabilities
- `brand-site`: homepage structure, header behavior, footer signature, and the
  motion system are re-specified to match the reference quality bar.

## Impact

- `src/components/layout/Header` (promo strip, scroll slide-in, mega menu)
- `src/components/layout/Footer` (wordmark signature)
- `src/app/[locale]/page` (category part, core-product part, motion)
- `src/app/[locale]/collections/**` (sticky sub-tab bar)
- `src/app/[locale]/products/page` (sticky sub-tab bar)
- `src/components/product/ProductCard` (cross-fade + slide-up info bar)
- `src/components/Reveal` / `src/hooks/useReveal` (new variants)
- `src/app/globals.css` (motion tokens, sticky tab styles)
- `messages/*.json` (new copy keys)
