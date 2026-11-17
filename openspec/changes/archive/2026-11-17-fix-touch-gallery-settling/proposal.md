## Why

Phone users report that home and product rails follow contact but do not settle to the next image. The shared hook mixes Touch Events for touch input with Pointer Events for mouse/pen. Its unfiltered lost-pointer-capture handler can cancel a touch-owned gesture before touchend computes a destination; previous browser validation used mouse input and did not exercise this combined event stream.

## What Changes

- Reproduce browser touch/capture completion ordering and add failing regression tests.
- Restrict pointer cancellation/release to the owning mouse/pen pointer; preserve the touch stream until its own end/cancel.
- Verify destination distance/velocity, complete viewport alignment, repeated swipes and cancellation on both media components.
- Build externally and release storefront only, preserving business settings, workers and rollback points.

## Capabilities

### Modified Capabilities

- `brand-site`: media touch completion and input ownership.

## Impact

Shared media gesture hook and regression tests. No product data, checkout, payment, attribution, admin or Shopify configuration change.
