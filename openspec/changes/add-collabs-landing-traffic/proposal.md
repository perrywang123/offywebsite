# Consent-aware Collabs landing PV and browser UV

## Why

The owner approved the dt_id landing-traffic proposal and requests replacing the private KOL contact address with contact@whimcoreofficial.com. Existing short-link request counts miss direct Offy landings and do not identify unique browsers.

## What Changes

- Add independent, consent-gated, asynchronous observation of Offy landing pages carrying a known official dt_id.
- Store UTC PV aggregates, idempotent event receipts and purpose-hashed anonymous browser/day membership; show true period-distinct UV, not summed daily UV.
- Use a purpose-signed first-party visitor cookie with a fixed maximum lifetime of 90 days. Withdrawal clears the cookie and removes associated UV membership while retaining anonymous aggregate PV.
- Limit request size and request rate, reject cross-origin/unknown tracking values and keep failures outside commerce.
- Add administrator traffic views by dt_id, grouping legacy aliases and distinguishing Offy PV/UV, redirect requests and official Collabs evidence.
- Replace the current KOL cooperation address in code, operational documentation, native Collabs contact settings and the two live SOPs; preserve administrator login and historical evidence.

## Capabilities

- Added: `collabs-landing-traffic`.
- Modified operational contact content; no change to commercial or financial contracts.

## Impact

Additive SQLite migration; public observation endpoint; isolated client observer; protected administrator reader/UI; bounded worker cleanup. Build in CI, deploy admin/migrations first and storefront separately. No checkout, products, native commission/payment, DNS or storefront-domain changes. Shopify-only page visits remain outside Offy's observations. No raw IP, full user agent, buyer details or device fingerprint is persisted.
