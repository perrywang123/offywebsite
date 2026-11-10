# Fixed automatic lifetime

Automatic choices carry `resolvedAt` in server epoch milliseconds and expire at `resolvedAt + 30 minutes`. The cookie also has a 1,800-second Max-Age. The server independently checks the timestamp, including when a browser restores or manually replays a cookie. Existing timestamp-free automatic cookies are immediately considered stale; timestamp-free manual cookies remain valid.

`countryDecision` returns a generation time only for automatic results. `resolve` preserves a still-valid result without another Set-Cookie, so refresh and repeat resolve requests never create a sliding lifetime. All existing signals and their precedence remain unchanged.

An expired preference is ignored by the server on the next request. The provider continues the existing first-page bootstrap and verifies that cookies were accepted before reloading. Since App Router can preserve layouts, route/query changes and visibility return must also check context. If an established context is no longer persisted, or the country differs, reload the same URL once so all components rehydrate together. Do not run periodic timers, reload an actively edited destination dialog, or loop when cookie persistence/network access fails. Existing stale-country checkout rejection remains authoritative if expiry occurs between display and submission.

No cart identifiers, quantities or tracking URL parameters are changed. No claim is made that an IP recommendation establishes physical location or final shipping eligibility.

Bag catalog reads include their displayed destination as a consistency guard. If expiry changes the server destination, list/detail endpoints reject before querying Shopify. The bag discards that response and requests same-URL rehydration with the existing bag-review flag. This prevents fresh prices from another market appearing under a stale header; an open manual destination dialog takes priority over automatic reloading.
