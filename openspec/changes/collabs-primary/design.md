# Technical design

## Accounting boundary

`KOL_ACCOUNTING_MODE=offy|collabs` defaults to `offy` for compatibility. Production cutover explicitly selects `collabs`; user-facing/admin state labels the source. In Collabs mode, old contract, code and settlement history remains readable but local code issuing, local attribution-to-commission creation and settlement mutation are rejected. New partner mappings contain only the operator's mapping to a Collabs profile and a validated official link; they are not authoritative commission terms.

## Report model

Use additive SQLite tables for creator mappings, import batches, normalized observations and review actions. Store report kind, filename, source checksum, original headers, mapping, operator, reporting window, row number, currency, granularity and source values. Imports require explicit preview mapping to the actual export. Reject ambiguous numbers/invalid dates, oversized input and inconsistent currency instead of guessing. Exact file imports are idempotent; overlapping batches are observations/snapshots, never an additive earnings ledger. Corrections preserve earlier batches with explicit supersession. Aggregate reports cannot claim per-order reconciliation. Payment/billing status is only a stated source value, never inferred from checkout/order status.

## Reconciliation

Read Shopify order facts with the existing optional Admin client; use exact shop/order identity and currency, retain missing/unreadable as findings. Only compare fields with matching definitions and granularity. Flag unmatched order/creator, duplicate observations, canceled/refunded order with active commission, inconsistent sales/currency and missing settlement evidence. Internal estimates must be labelled estimates. Findings cannot cancel a Collabs commission, refund an order or send money.

## Storefront

Use the official published Shopify runtime compatible with React 19, retaining Next.js 15 and next-intl. Limit Shopify route interception to explicitly supported commerce/tracking routes and retain `/admin` and `/api/admin` isolation. Discount routes preserve Collabs parameters and safe same-origin return paths; use Shopify Cart discount validation rather than client price arithmetic. Forward request-scoped tracking values/cookies to the cart and apply response cookies without sharing catalog caches. Shopify redirect lookup happens only after an ordinary route is absent and must not redirect admin/API/assets. SDK failures are observable and must not break normal shopping; they do not claim successful tracking. UI events respect customer consent.

## UI direction

Preserve the black/white ledger, 44px controls, persistent navigation and labelled responsive filters. Collabs work starts with source/connection freshness, report import preview and actionable findings; financial numbers are grouped by currency. Official portal links are secondary navigation. Empty data states explain what must be imported/configured. No fake analytics, default payable rate or local payment button is presented as Collabs truth.

## Deployment

Build revision-labelled Linux amd64 images outside production. The manually dispatched GitHub Actions workflow exports a Docker image artifact, verifies native SQLite migrations, and includes its checksum/source revision; it receives no production credentials and does not automatically deploy. Server releases require matching Git HEAD and prebuilt image labels.

Additive schema first via admin migration; deploy admin/worker then storefront with the same source revision and explicit cutover. Keep loopback ports 3000/3001 and existing HTTPS ingress. Do not build both images concurrently on the 2-core production server. Record image IDs, Git revisions, health and Nginx hashes before/after. A previous image is not a complete business rollback once Collabs obligations exist; keep external accounting ownership and stop rollout before changing it back. Application grants/terms require explicit action-time confirmation. Real checkout payments, creator invitations and refunds require separate concrete authorization.
