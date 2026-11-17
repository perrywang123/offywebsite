# Smooth storefront galleries

## Why

Home banners drag as a stacked fading group and swap content on release. Product media only changes via thumbnails. Shoppers need direct horizontal manipulation without accidental navigation or interference with page scrolling.

## What Changes

- Replace the banner fade/swap gesture with a continuous horizontal slide and predictable settling, retaining its five original layouts and destinations.
- Add direct horizontal swipe/drag to product media, synchronized with thumbnail selection.
- Share gesture arbitration, cancellation and click protection; retain keyboard access, reduced-motion behavior and native vertical scrolling/pinch zoom.
- Validate locally and ship a revision-verified prebuilt storefront image without production compilation or admin/worker deployment.

## Capabilities

### Modified

- brand-site: carousel and product-media interaction.

## Impact

UI components and gesture tests only. No catalog, pricing, cart, checkout, payment, attribution, database or Shopify configuration changes.
