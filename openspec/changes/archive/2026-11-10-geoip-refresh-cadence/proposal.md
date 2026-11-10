# Reduce the optional Country database update cadence

## Why

GeoLite Country normally publishes on Tuesdays and Fridays. Offy uses the local database only for destination recommendations, so a daily download check is unnecessary.

## What Changes

- Check for new Country databases every 72 hours, with an immediate first run.
- Activate the approved dedicated download key and updater independently of the storefront and management services.
- Record actual enrollment, download and production verification without storing credentials in Git.

## Capabilities

- Modified `market-localization`: specify the optional updater's low-frequency operation and service isolation.

## Impact

Only the companion Compose configuration, deployment verification and documentation change. No storefront rebuild, application restart, Shopify mutation or customer IP upload is required.
