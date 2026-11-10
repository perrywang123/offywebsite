## MODIFIED Requirements

### Requirement: Stable destination resolution

The storefront SHALL prefer a valid manual destination, then its unexpired automatic decision. Manual choices SHALL retain their existing 90-day cookie behavior, including legacy manual cookies. Automatic decisions SHALL carry a server-generated timestamp, have a fixed 30-minute lifetime and SHALL NOT be extended by reads or repeated resolve calls. Expired, malformed, future-dated and timestamp-free legacy automatic decisions SHALL be ignored. A fresh decision SHALL use a configured trusted country header or real-client IP, then a geographical IANA browser timezone, then a valid regional browser language, finally US. Bare languages, UTC offsets, unknown zones and malformed country codes SHALL NOT imply a country. Browser hints SHALL NOT override a usable IP result or saved manual choice. The chosen country SHALL be shared by catalog, bag and checkout and diagnostics SHALL retain bounded source evidence without raw IP.

#### Scenario: Browser fallback after unknown IP

- **WHEN** IP cannot resolve a country and the timezone is Europe/London while the language is en-US
- **THEN** GB is recommended; without a mapped timezone, en-GB yields GB; with no useful signals US is used

#### Scenario: Explicit choice and session stability

- **WHEN** a visitor has a manual US preference or an automatic GB recommendation less than 30 minutes old and their IP changes
- **THEN** the existing choice remains; only the automatic recommendation becomes eligible for fresh resolution at its original 30-minute boundary

#### Scenario: Expired or legacy automatic recommendation

- **WHEN** an automatic cookie is at least 30 minutes old or has no valid server timestamp
- **THEN** the server resolves a fresh recommendation using current signals; a corresponding legacy manual choice remains unchanged

### Requirement: Destination selection and bootstrap

The storefront SHALL expose the approved desktop panel, mobile bottom sheet and bag destination entry. Supported choices and displayed currencies SHALL come from Shopify. Confirmation SHALL precede manual persistence and repricing; cancel SHALL not change destination. Browser hint bootstrap SHALL be bounded, verify persistence before reloading, preserve the current URL and avoid reload loops when cookies or requests fail. An established destination context SHALL be checked on route/query changes and visibility return; expiry or a changed destination SHALL rehydrate the page consistently. Bag catalog reads SHALL carry their displayed country and reject a mismatch before Shopify reads, preserving identities while requesting consistent rehydration. Active pages SHALL NOT be reloaded by a periodic expiry timer and an open destination dialog SHALL NOT be interrupted. Failed market reads/saves SHALL offer retry and SHALL NOT claim a successful change. Same-origin mutation protection and country validation SHALL apply.

#### Scenario: Switching with a bag

- **WHEN** a visitor confirms another destination with saved items
- **THEN** the UI first explains repricing/availability review, preserves item identities and quantities, and opens the revalidated bag after switching

#### Scenario: Product not sold in the new destination

- **WHEN** a destination switch makes the current product URL unavailable
- **THEN** a branded not-found boundary preserves destination and bag controls without unverified commercial facts

#### Scenario: Cookies unavailable

- **WHEN** a browser cannot persist the destination cookie
- **THEN** bootstrap does not loop and a manual save does not falsely announce success

#### Scenario: Returning after automatic expiry

- **WHEN** a visitor returns to or navigates within an established automatic session after its preference expired
- **THEN** the current URL is reloaded once at that boundary for fresh resolution; ordinary idle time causes no forced reload

#### Scenario: Bag read after expiry

- **WHEN** a bag displayed in GB requests catalog facts after automatic expiry resolves SG
- **THEN** the list/detail read returns a destination conflict without querying Shopify, no SG facts are displayed in the stale GB context, and a same-URL reload preserves the bag for review
