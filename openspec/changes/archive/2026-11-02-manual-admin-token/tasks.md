## 1. Spec and TDD

- [x] 1.1 Validate the manual token configuration and independent rotation delta.
- [x] 1.2 Observe failing tests for optional-token deployment, paused worker task preservation, remote-operation errors and rotation with an older peer token.

## 2. Implementation

- [x] 2.1 Keep optional manual runtime injection and exclude only the Admin token from running-peer drift checks.
- [x] 2.2 Pause Shopify work without consuming tasks; preserve local maintenance and a truthful heartbeat/status, and fail explicit remote operations clearly.
- [x] 2.3 Document server configuration, admin-only application, permissions and manual renewal boundaries.

## 3. Validation

- [x] 3.1 Run deployment/worker/UI regressions, browser verification, full tests, typecheck, lint, production build and relevant syntax/format checks.
- [x] 3.2 Record evidence, archive the change and verify the Git scope without private values.
