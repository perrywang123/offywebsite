## Product and interaction decision

Product, interaction and frontend experts agreed to keep the five approved home compositions and the PDP media presentation. Replace the home stack/fade with a real horizontal track; add the same direct manipulation to the product media area. Do not change product data, prices, purchase actions, attribution, or Shopify configuration.

## Layout and rendering

A single CSS Grid row with 100% auto columns lets the five home screens share their tallest natural content height. The viewport clips horizontal overflow while the track translates continuously; existing image/copy regions and indicator clearance remain intact. PDP keeps object-contain and its current responsive aspect ratios. Thumbnail buttons remain available. No new dependency is required.

## Gesture contract

Use an 8px intent dead zone and a horizontal/vertical ratio of 1.2. Preserve native vertical scrolling and pinch zoom. Horizontal contact paints the track directly without React state updates on every move. Settle by distance (18% of width, clamped to 40–80px) or recent velocity (approximately 0.5px/ms with a minimum deliberate displacement), at most one adjacent image. Use a 280ms easing; a short drag returns. Manual endpoints resist without looping. Automatic Hero wrap must not sweep across all five screens.

Once horizontal dragging is established, suppress the subsequent pointer click even if the contact returns to its start. A new independent tap clears the guard. Multi-touch, cancellation and lost focus abandon selection and release drag/autoplay state. Normal links and keyboard activation retain their original destinations. Reduced motion retains direct contact following but disables autoplay and animated settling.

## Verification and release

Test decisions and cancellation in Vitest, then inspect real browser drag, thumbnail synchronization, vertical scrolling, links, responsive geometry and the five-screen layout. Record the limitations of available touch hardware. Build the exact committed Linux amd64 image outside production, preserve the current application rollback image and SQLite backup, and update only the storefront through the existing prebuilt deployment script. Verify both storefront and unchanged background services after deployment.
