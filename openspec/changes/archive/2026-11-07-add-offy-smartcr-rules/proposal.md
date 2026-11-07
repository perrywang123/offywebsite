# Offy project review rules

## Why

The owner requested installation of SmartCR rules before completing the Collabs code review. The local reviewer skill is installed, but this repository has no project rule library.

## What Changes

- Add project-authored SmartCR rules and domain context derived from current Offy contracts.
- Cover Shopify data authority, money/currency, Collabs accounting boundaries, administrator access, safe tracking redirects and isolated deployments.
- Document an external Python virtual environment for local AST inspection and the reviewer workflow. Do not add dependencies to the production image or install a remote corporate rules package without a verified source.

## Capabilities

Tooling only; no product behavior or specification delta.

## Impact

Versioned `.smartcr` configuration and developer documentation. No store settings, database changes, credentials, production builds or service restarts.
