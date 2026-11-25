## Why

Shoppers should see the same local opening time on the homepage and the product detail page. The storefront already reads one release instant from Shopify for both surfaces.

## What Changes

- Format the opening date and time in Eastern time on both Coming Soon surfaces, with EST or EDT chosen for the release date.
- Keep the machine-readable instant and countdown tied to the Shopify product metafield.

## Capabilities

### Modified Capabilities

- `brand-site`: show the Eastern release time on homepage preview cards.
- `commerce`: specify matching Eastern time and countdown semantics for the card and detail page.

## Impact

The shared Coming Soon component formats the Shopify instant in Eastern time and uses that instant for the countdown.
