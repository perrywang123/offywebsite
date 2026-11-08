## Preparation and implementation

- [x] Read existing runtime and verify actual Shopify and Meta identifiers.
- [x] Confirm US priority and preserve the owner's product-publication boundary.
- [x] Add failing tests for private configuration preservation, check-only operation and rejected mappings.
- [x] Implement the configuration command and store audited mappings for the existing catalog only.
- [x] Validate OpenSpec, relevant checks and the full test suite before committing.

## Production activation and verification

- [x] Commit and push repository changes; fast-forward the production checkout.
- [x] Back up configuration/database and record current running images and proxy configuration privately.
- [x] Apply only META_CATALOG_IDS and reload the same app/admin images without compilation or dependency restarts.
- [x] Verify production health, mapping counts, real product events and accepted CAPI delivery.
- [x] Verify existing Shopify checkout without submitting an order, restore test shopping state and document remaining catalog constraints.
- [x] Update SOP/validation evidence and archive the tooling change.
