# Responsive hero typography

## Why

The first homepage banner has smaller mobile copy than the other slides. Its absolute text/logo positions compete with the seven photographed OFFYs. The owner requires a visual proposal before production implementation, with no overlap at any supported size or text scale.

## What Changes

- Prepare a standalone responsive HTML proposal using the existing photograph, logo and English copy.
- Recommend separate normal-flow text and photo regions, with larger mobile text and intrinsic expansion when wrapping.
- Preserve the complete photographed character row. Desktop keeps the original overall proportion where the content fits.
- Leave production components, carousel, checkout and Shopify configuration untouched pending confirmation.

## Capabilities

- Modified after approval: brand-site homepage brand slide layout.
- This proposal does not claim a completed production behavior change.

## Impact

Only design artifacts in docs/design/hero-brand-responsive and this pending OpenSpec proposal. Implementation, regression tests and deployment require owner confirmation.

## 2026-11-11 review extension

The owner confirmed the brand-slide design and requested inspection of the remaining slides after observing clipped promo copy on mobile. The additional proposal uses normal-flow photo and copy regions for the promo and series slides, mildly enlarges mobile series subtitles and reserves a separate indicator area. All five proposed panels participate in one intrinsic grid height. Default Chrome did not reproduce the exact WeChat clipping; a 130% copy-size simulation reproduced the same three-line failure in the old layout. See docs/design/hero-brand-responsive/all-slides for measurements and previews. These four additional layouts await confirmation; production components remain unchanged.

## 2026-11-11 implementation authorization

The owner approved all five layouts and the favicon correction, with local acceptance followed by production deployment. The implementation now uses intrinsic grid sizing, separate photo/copy regions, original five destinations, the existing gesture/autoplay behavior and an aspect-preserving PNG icon. The root icon route bypasses locale rewriting only for `/icon`; storefront routes retain their previous behavior. Deployment uses the revision-verified CI image and updates only the storefront. Earlier pending statements above describe the design-review phase.
