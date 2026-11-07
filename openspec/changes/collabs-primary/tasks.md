## 1. Baseline and contract

- [ ] Confirm the current Shopify SDK contract, store identity, Collabs install permissions and export schemas.
- [x] Validate proposal/spec deltas before implementation.
- [x] Record additive migration, accounting cutover and release/rollback plan.

## 2. TDD implementation

- [x] Write failing tests for exact CSV parsing/mapping, duplicate imports, unknown states, granularity and read-only reconciliation.
- [x] Implement authenticated report preview/import/history and official link mappings with audit.
- [x] Block legacy financial/code mutations and new local commission generation in Collabs mode.
- [x] Write failing tests for discounts, safe redirects, tracking context and checkout market preservation.
- [x] Integrate Shopify runtime/privacy, page-view events (the local bag is not a fabricated Shopify cart), request tracking and discount/redirect routes.
- [x] Implement the admin reconciliation workspace, errors, import preview, provenance and official portal links.

## 3. Validation and rollout

- [ ] Run complete tests, typecheck, lint, formatting, production build and isolated browser interactions.
- [ ] Obtain required action-time Collabs application authorization/terms approval; configure invite-only and 30-day holding without sending invitations or creating real transactions.
- [ ] Confirm real export headers, report granularity and available tracking/attribution behavior; do not invent missing fields.
- [ ] Push reviewed implementation to Git before server pulls; build compatible Linux images with resource protection.
- [ ] Back up DB, deploy admin and storefront separately, verify public/private boundary, ordinary shopping, discount handling and tracking on deployed code.
- [ ] Investigate any failed check, fix, retest and redeploy as necessary; remove isolated process data and document residual external gates honestly.
- [ ] Archive the completed change only after required implementation and verification are actually complete.
