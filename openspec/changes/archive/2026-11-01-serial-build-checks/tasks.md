## 1. Spec and TDD

- [x] 1.1 Define the sequential quality gate and private build diagnostics.
- [x] 1.2 Add failing tests for phase order, lint/type failure, progress/cancellation and private deployment log retention.

## 2. Implementation

- [x] 2.1 Add the build runner and canonical package command; retain Next.js type checking.
- [x] 2.2 Persist plain Docker build logs, preserve failure status and exclude private artifacts.
- [x] 2.3 Update server execution and troubleshooting documentation.

## 3. Verification

- [x] 3.1 Verify real lint/type failure gates and a successful standalone build; run full tests, typecheck, lint and relevant syntax/format/spec checks.
- [x] 3.2 Record validation limits, archive the delta, check credentials/scope and commit/push.
