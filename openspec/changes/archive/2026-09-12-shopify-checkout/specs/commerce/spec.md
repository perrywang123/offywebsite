## ADDED Requirements

### Requirement: Shopify-hosted checkout provider
The system SHALL support a `shopify` payment provider that builds a cart via the
Shopify Storefront API and redirects the buyer to the Shopify-hosted
`checkoutUrl`. Cart lines SHALL be resolved server-side by mapping each catalog
product `code` to its `shopifyVariantId`; the client-supplied price is never
trusted.

#### Scenario: Create Shopify checkout
- **WHEN** a buyer checks out with `provider=shopify` and cart items that map to Shopify variants
- **THEN** the system creates a cart via the Storefront API and returns the `checkoutUrl` as a redirect

#### Scenario: Missing Shopify configuration
- **WHEN** no Shopify store domain / Storefront token is configured
- **THEN** the checkout returns HTTP 503 without throwing

#### Scenario: Item without a Shopify variant mapping
- **WHEN** a cart item has no `shopifyVariantId` in the catalog
- **THEN** the checkout returns HTTP 400 and creates no cart

#### Scenario: Order confirmation is delegated to Shopify
- **WHEN** the buyer completes payment on the Shopify-hosted checkout
- **THEN** the order is owned by Shopify and the provider's `capture` is a no-op (returns not-supported), with order write-back reserved for a future webhook milestone
