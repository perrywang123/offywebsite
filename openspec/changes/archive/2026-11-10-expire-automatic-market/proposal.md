# Expire automatic destination recommendations

## Why

An automatic UK recommendation can survive network changes for the entire restored browser session. It has no generation time, so users cannot benefit from a fresh IP lookup after a bounded period.

## What Changes

- Give every server-generated automatic recommendation a fixed 30-minute lifetime and server timestamp. Requests do not extend it.
- Ignore expired, future-dated, malformed or legacy timestamp-free automatic cookies and run the existing IP/timezone/language/US sequence again.
- Preserve manual choices, including existing manual cookies, for the existing 90 days.
- Recheck destination context on route changes and return to the page. Expired established sessions reload at these interaction boundaries; no timer refreshes an active shopping page.
- Preserve cookie acceptance checks, bounded network errors, bag identities, market-specific prices and the existing stale-country checkout guard.

## Capabilities

- Modified `market-localization`: bounded automatic preference lifetime and renewal boundaries.

## Impact

Destination contracts, cookie parsing, market API, provider navigation synchronization, regression tests and current documentation. No changes to Shopify configuration, commission logic, admin, workers or the 72-hour GeoLite update cadence.
