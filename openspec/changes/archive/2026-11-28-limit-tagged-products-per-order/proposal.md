## Why

Limited releases such as MERRY OFFY can be marked in Shopify so shoppers see the order limit and can fix their bag before leaving Offy for checkout.

## What Changes

- Read the exact Shopify product tag `limit-1-per-order` from the live Storefront catalog and show the limit on the product page and in the bag.
- Prevent increases beyond one unit and tell shoppers how to correct a previously saved quantity.
- Check the total quantity per Shopify product on the server before creating the hosted checkout cart.

## Capabilities

- Extend `commerce` with a merchant-configured per-order purchase limit for tagged products.

## Impact

- Shopify Storefront product reads, product detail, shopping bag and hosted checkout preparation.
- Guest checkout stays available. The configured LimitOne rules run in Shopify checkout. The merchant owns both configurations.
