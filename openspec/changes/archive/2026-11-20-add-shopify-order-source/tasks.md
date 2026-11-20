## 1. Exact order lookup

- [x] 1.1 Test the authenticated lookup for Shop and Offy orders, including missing, partial and conflicting ad evidence.
- [x] 1.2 Implement the bounded read-only Shopify lookup. Preserve local evidence when Shopify is unavailable.
- [x] 1.3 Show the sales channel, recorded source and lookup state in the existing order search. Update the SOP.

## 2. Verification

- [x] 2.1 Run tests, typecheck, lint, production build and OpenSpec validation.
- [x] 2.2 Verify the admin search with an isolated Shopify fixture and confirm the API contract against existing production orders.
