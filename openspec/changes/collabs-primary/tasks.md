## 1. Baseline and contract

- [x] Confirm the current Shopify SDK contract, store identity and Collabs install permissions.
- [ ] Inspect actual export schemas when the first official report is available; do not treat simulator columns as Shopify's schema.
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

- [x] Run complete tests, typecheck, lint, formatting, production build and isolated browser interactions.
- [x] Obtain required action-time Collabs application authorization/terms approval; retain invite-only/Open Access disabled and 30-day holding without sending invitations or creating real transactions.
- [x] Independently read the verified business contact and native automatic-payments page, including 30-day holding and the next-Shopify-bill notice; retain screenshots without treating zero balances as payout verification.
- [x] Reproduce the asynchronous Collabs API error-boundary failure, add failing route-level regressions, fix and rerun negative-input and isolated browser validation.
- [x] Remove misleading legacy scan controls from Collabs connection information and test that reconnect only performs the read-only connection check.
- [x] Publish the revalidation fixes as an admin-only prebuilt image update and verify the storefront container stays unchanged.
- [x] Complete the owner-requested basic logic/boundary review with the installed project SmartCR rules; record the reproducible dot-path target flaw without changing the core redirect flow before owner confirmation.
- [x] Create and visually verify separate administrator and creator SOPs in the signed-in Feishu account.
- [ ] Obtain owner confirmation before correcting the dot-path normalization flaw in promotion target validation; add regressions and verify any approved implementation before rollout.
- [ ] Confirm real export headers, report granularity and available tracking/attribution behavior; do not invent missing fields.
- [x] Push reviewed implementation to Git before server pulls; build compatible Linux images with resource protection.
- [x] Back up DB, deploy admin and storefront separately, verify public/private boundary, ordinary shopping, discount handling and tracking on deployed code.
- [x] Investigate failed checks, fix and retest; clear the owned unpaid live cart and its diagnostic, preserve real records, and document residual external gates honestly.
- [ ] Archive the completed change only after required implementation and verification are actually complete.
