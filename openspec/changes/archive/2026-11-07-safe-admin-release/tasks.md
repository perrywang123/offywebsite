## 1. Specification and regression tests

- [x] Validate proposal and deployment deltas.
- [x] Demonstrate failing tests for memory isolation, host headroom and legacy service states; verify Git revision propagation through a pulled upstream.

## 2. Implementation

- [x] Implement bounded builder memory/swap and host headroom checks.
- [x] Block both legacy service names before deployment and in check-only.
- [x] Add image Git revision metadata and deployment documentation.

## 3. Verification and release

- [x] Run deployment tests, full tests, typecheck and lint (100 files / 687 tests; production image build remains part of server verification below).
- [x] Archive specifications and push reviewed changes to Git.
- [x] Pull on server, deploy only admin/worker with verified limits, and verify revision and management availability.
- [x] Verify original storefront container ID/start time and public health remain unchanged.
