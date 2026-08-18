## Why

The brand site needs a way for visitors to subscribe to product updates and
brand stories. This establishes the first end-to-end data path (UI → API →
database) on the site.

## What Changes

Add a newsletter subscription capability: a client form posts an email to a new
`/api/newsletter` route, which validates, normalizes, and stores the address in
a new `newsletter_subscribers` table.

## Capabilities

### New Capabilities
- `newsletter`: accept, validate, normalize, and deduplicate subscriber emails.

### Modified Capabilities
<!-- none -->

## Impact

- `src/lib/validation` (new `isValidEmail`)
- `src/server/db/schema` (new table)
- `src/server/newsletter/subscribe` (new service)
- `src/app/api/newsletter/route` (new route)
- `src/components/newsletter-form` (new client form)
- `db/migrations` (new migration)
