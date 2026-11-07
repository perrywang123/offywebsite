# Exclude downloaded deployment images

## Why

CI image archives are downloaded into the server checkout under `.deploy-artifacts/`. These large host-local files must not enter Git or a later manual Docker build context.

## What Changes

- Exclude the host-local artifact directory from Git and Docker build contexts.
- Retain existing archives for deployment and rollback; do not restart services.

## Capabilities

Deployment tooling only; no product behavior or specification delta.

## Impact

Two ignore patterns. No application, database, credentials, checkout or payment changes.
