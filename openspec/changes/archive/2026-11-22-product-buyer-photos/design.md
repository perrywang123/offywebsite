## Layout

The photographs lead the section. On the existing page background, use a fine divider, an OFFY headline and an arrow with a 44px touch target. A three-column row shows up to three square images without visible captions. The photo dialog fits the viewport and keeps the full image visible. Reuse the site's swipe rail for touch and support arrow keys and Escape. Closing returns focus to the triggering control.

## Data flow

Fetch `custom.buyer_photos` separately via the current product handle and market. Stream the optional section after the product has loaded. Filter unavailable references, non-images, and URLs outside the Shopify CDN. Use the returned order. A failed fetch or no usable photos renders nothing. Limit this query to product detail.

## Release

Clear the three test photo references in Shopify and verify the empty field through the Storefront API. Validate positive and failure cases locally with isolated data. Commit production code, specifications and operator instructions. Deploy the storefront and verify the new running revision and product entry points.
