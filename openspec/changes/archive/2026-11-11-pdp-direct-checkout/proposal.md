# Why

The approved PDP design provides a shorter single-product purchase path alongside Add to Bag. Reusing the current return page without distinguishing checkout origin would erase unrelated saved bag items.

# What Changes

- Add mobile and desktop Buy Now controls for one current Shopify product, keeping the bag intact.
- Reuse checkout country validation, diagnostics, Collabs and Meta context, with an explicit buy-now intent.
- Preserve the bag on direct-checkout return using the return URL and a tab-local fallback; keep normal bag and legacy success behavior.
- Per the latest user instruction, do not introduce special handling or Shopify configuration for SWAN QUEEN.

# Capabilities

- Modified: commerce.

# Impact

PDP controls, shared checkout hook, Shopify provider and return handling. No production deployment, order submission, prices, inventory or discount changes in this task.
