## Why

The owner approved the announcement-bar and bag-drawer copy from `OFFY_三处运费文案调整说明.pdf`, then supplied the final FAQ wording in this conversation on 2026-11-09. The previous flat-rate claim does not explain the US quantity exception.

## What Changes

- Replace only the shipping announcement with `OFFY GOES GLOBAL · WORLDWIDE SHIPPING FROM $15 USD`, preserving the gift promotion and current rotation/styling.
- Add the two approved fixed English shipping notices below the verified bag subtotal and above Checkout, regardless of visitor market or bag quantity.
- Preserve market-currency subtotals, existing checkout preparation, and unavailable/empty states.
- Insert the owner's final shipping-cost FAQ as Shipping Q1 with three exact paragraphs, shifting the five existing Shipping questions to Q2–Q6. Preserve all existing answers and the other two parts; generated FAQ structured data follows the same content.
- The standalone `/cart` page is outside this change.

## Capabilities

- Modified `brand-site`: explicit shared shipping announcement and the approved eleven-question FAQ.
- Modified `commerce`: informational bag-drawer shipping notices without client-side freight calculation.

## Impact

Affected paths: `messages/en.json`, matching retained dictionary keys, `src/components/cart/CartDrawer.tsx`, `src/lib/faq.ts`, targeted tests and operational validation notes. No server configuration, shipping-rate configuration, product publication, tracking, database, payment or deployment changes. Shipping charges remain Shopify-owned; this copy change does not verify or alter those rates.
