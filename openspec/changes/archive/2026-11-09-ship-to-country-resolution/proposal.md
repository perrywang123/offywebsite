# Why

Offy currently recomputes a visitor market from unqualified country headers or a bundled IP database. Customers cannot correct it, browser hints are unavailable as a fallback, and a country change can make saved regional items disappear.

# What Changes

- Add the approved Ship to selector: desktop panel, mobile bottom sheet and bag entry; confirm before changing destination.
- Resolve manual choice, a saved session decision, trusted IP evidence, IANA timezone, regional browser language, then US. Never use a bare language or UTC offset as a country.
- Bootstrap browser hints once when needed, preserve the destination throughout shopping, and verify the market before checkout.
- Read selectable countries/currencies from Shopify; keep unresolvable bag identities without inventing product facts or removing them automatically.
- Support an optional refreshable MaxMind country database and credential-isolated updater; enrollment/license activation depends on the owner's MaxMind account.

# Capabilities

- New: market-localization.
- Modified: commerce (cart preservation across destination changes).

# Impact

Server country resolution, storefront layout/header/bag, localization API, diagnostics, optional deployment configuration and documentation. No Shopify product/rate/order edits; no Collabs commission changes. Release only the storefront using a native prebuilt Linux image, leaving admin and existing workers running.
