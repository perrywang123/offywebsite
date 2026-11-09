# Technical design

## Country resolution

Keep pure, client-safe country/cookie contracts separate from the Node-only IP resolver. Manual preference is a 90-day HttpOnly same-site cookie; an automatically resolved decision is a session cookie. Existing saved decisions precede new network/hint evidence, so an IP change does not silently reprice a current bag. New automatic decisions use configured trusted country header, trusted Nginx X-Real-IP (otherwise the existing XFF path), IANA geographical zone metadata, regional language and US. Diagnostics retain bounded decision metadata, never raw IP or unrelated headers.

Browser timezone is sent to a same-origin JSON endpoint. For unknown IP, the initial main surface waits for this bounded bootstrap; changed market reloads the existing URL once after verifying the cookie was stored. Blocked cookies or transport errors release the initial view without loops. User-confirmed changes validate the country against live Shopify localization and reload the same URL, preserving tracking parameters and bag identities. No per-page Shopify geolocation requests or cross-origin recommendation workaround.

## UI and commerce

Use the approved native dialog panel/sheet, country search, explicit confirmation, 48px CTA and title focus rather than forced mobile keyboard. Country/currency choices come from Shopify; failed localization reads offer retry. A nonempty bag receives a factual warning that prices and availability can change, then opens for review after the destination switch. Missing market facts show generic unavailable rows without a price/image/name substitute and block complete subtotal/checkout. A checkout expected-country guard rejects a stale context before cart creation. Existing analytics and attribution parameters remain intact.

## Optional data refresh

Use a small external Country MMDB when present, retaining the bundled lookup when no valid external file exists. Refresh is separate from storefront deployment, with private credentials and atomic vendor updates. Account creation and accepting external service licenses stay with the owner where required. Missing refresh credentials do not prevent storefront startup.

## Verification and release

TDD for precedence, malformed cookies/hints, IP parsing, route origin/market validation, UI cancellation/confirmation, bag preservation and stale checkout. Full tests, types/lint/build, real responsive browser acceptance and isolated native Linux smoke precede storefront-only release. Preserve production configuration, shared DB backup and rollback image; verify peer container identities and live destination UI without creating an order.
