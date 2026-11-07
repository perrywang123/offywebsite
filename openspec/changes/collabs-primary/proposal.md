# Collabs primary accounting and storefront integration

## Why

The owner approved Collabs-native attribution, automatic payments, invite-only recruitment, a 30-day holding period, the official creator portal and report import. The current Offy session-only commission and manual settlement system must not create a second payable ledger for Collabs orders. The Next.js storefront currently lacks Shopify analytics, discount-link handling and Shopify redirect resolution.

## What Changes

- Add an explicit Collabs accounting mode with external official links, immutable report imports, provenance, reconciliation findings and operator review. Block legacy issuing, commission creation and manual payouts in this mode while preserving history.
- Integrate the supported Shopify analytics and privacy runtime with Next.js, browser navigation events, same-origin Storefront tracking continuity, discount-link handling and safe Shopify redirect resolution. Preserve market, catalog authority, checkout URLs, editorial imagery and non-KOL shopping.
- Keep official Collabs attribution/payments authoritative. Imported data is labelled as administrator-imported official reports, not API-verified or bank-confirmed. Unknown fields remain unknown. Do not derive payout status from order payment or a guessed commission rate.
- Add bounded CSV parsing, explicit column mapping, preview/confirmation, exact money/currency handling, row and report granularity, duplicate prevention, audit and anomaly review.
- Configure Shopify Collabs invitation-only/30-day settings after application authorization; no creator invitations, real charges/refunds or public recruitment as part of automatic testing.
- Test in an isolated copy/database, build Linux images away from the production server when possible, deploy compatible additive migrations and services separately, and verify the deployed storefront, admin, Shopify configuration and rollback evidence.

## Capabilities

- New `collabs-integration`: official accounting source, reports, mapping and reconciliation.
- Modified `commerce`: Shopify discount/redirect/tracking continuity without replacing checkout or catalog rules.
- Modified `kol-platform`: optional Collabs accounting mode supersedes local session attribution, code issuance and manual settlement for new activity.

## Impact

Next.js routes/layout/middleware, Shopify request transport, admin UI/API, SQLite additive migrations, deployment config and documentation. Shopify Collabs grants and legal/financial UI confirmations remain action-time requirements. No full Collabs API, creator payout API or fictitious synchronization is introduced. Existing deployments remain in legacy mode until explicit cutover. Historic source data is preserved.
