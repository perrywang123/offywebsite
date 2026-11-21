## Layout

Use the approved preview's quiet background, flexible title and price, compact intro, thin separators and image-led details. Keep all primary product pictures in the current rail. Use the mobile sticky purchase bar and place the existing desktop controls near the intro. Display explicit outfit and glasses information if the Shopify description supplies it. Use native disclosures for the remaining description and the gifts.

Place close-ups and guide images before the buyer gallery and series grid. Guide images retain their proportions and are the sole visible source of those specifications. Use the same lightbox controls for buyer photos and guides. Show product-specific details from configured Shopify references or matching curated roles on the currently attached gallery images.

## Gift data

The approved discount IDs select the current OFFY campaign. Shopify can supply presentation overrides through `gift_campaign` and `gift_tier` metaobjects. The storefront calls a server-authenticated read-only service for the rule status, threshold, audience, current item scope and reward references. The storefront checks reward availability in the selected market. Omit each unverified tier and omit the group if it is empty. No copy or image alone establishes a gift offer.

Shopify owns eligibility and final pricing. The disclosure describes how to add the eligible reward when offered. It submits neither gifts nor discounts by itself. The disclosure starts open on product arrival.

## Production verification

Build the pinned Git revision on GitHub Actions and verify its archive and image checksums. Use the separate Admin and storefront release commands. Confirm the active Admin grants, the selected rules, the storefront health endpoint and the live detail page at mobile and desktop sizes. Use the preview to exercise mock checkout and keep the production verification to read-only catalog checks and the local shopping bag.
