# Approved direction

Retain the gray/white Offy console. Show scope, five independent-stage browser totals, daily single-metric trends, then cohort funnel and delivery health side by side; ad groups and existing evidence follow. Mobile uses two-column totals, single-column charts and collapsible filters. Semantic chart colors stay consistent; use lightweight accessible SVG and a numeric table rather than new dependencies.

# Statistics

Global filters: explicit Shanghai date range (at most retained 30 days), recorded ad/campaign ID, all / ad-ID-labelled / unlabelled traffic and default test exclusion. Details alone add event/status/cohort-stage constraints. Aggregate all retained matching rows, never the current 30-row page. All responses keep raw visitor hashes, cookies and payloads server-only.

Daily counts are per event timestamp with per-day browser distincts. Period browser distincts are computed separately, not summed. A count of zero means no retained matching records, not proof of no actual activity; missing configuration/sync/failed reads remain explicitly unknown. Historical InitiateCheckout never becomes CheckoutReady. Retention, withdrawal, consent and capacity can leave unmeasurable gaps; no invented completeness or previous-period lifts.

Funnel: first retained matching PageView per browser → matching ViewContent at/after it → CheckoutReady with attemptId at/after product view → that exact attempt's Shopify order at/after checkout and inside the same selected window. Equal timestamps use nondecreasing event time. Each stage counts a browser once. AddToCart after product view is an optional branch; Buy Now bypasses it. Stage-independent summary totals may exceed the complete-observation cohort. Missing precursor records do not get reconstructed. Ad groups use the same rule per recorded ad ID; source-changing browsers may be in several ad groups, so group browser totals cannot be added.

Payment evidence: non-canceled PAID/PARTIALLY_REFUNDED/REFUNDED facts, excluding test orders by default, matching retained CheckoutReady. Keep order totals/refunds grouped by currency; this is evidence of payment history, not net revenue or Meta attribution. Pending/authorized/partially paid orders do not count as completed payment history. Unknown/unconfigured/failed/stale (>45 minutes since successful scan) sync makes the final funnel value unknown; older facts remain inspectable in the existing order section with sync warnings.

CAPI health denominator contains AddToCart only. Observed-only/browser-only/Shopify-owned events are never failures. Zero jobs has no success percentage. sent means API acceptance, not ad attribution. No Marketing API spend, impressions, clicks, CPA or ROAS is invented; link to Meta.

Stage drill-down uses server-only eligible visitor sets and existing pagination/trace, avoiding identifiers in browser or URLs. Details filters do not erase funnel stages. No automatic refresh loop: explicit refresh and applied global scope, with request sequencing/aborts so stale responses cannot replace current data. Retain previous snapshot labelled stale if a read fails.

# Release

No schema/commerce changes. Test and build in isolation/CI, then deploy admin + existing admin worker only with prebuilt revision verification and DB backup. Do not rebuild on the two-core production machine; verify app and Meta worker container IDs/startedAt stay unchanged. No ads, purchases or test orders are created by validation.
