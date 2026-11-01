## Why

Server build records show Next.js compilation completing before an extended wait at parallel lint/type checking, followed by cancellation. The cause of cancellation is not proven. A one-CPU build should avoid concurrent lint/type workers, and deployment needs durable logs and explicit progress without weakening validation.

## What Changes

- Make `pnpm build` run mandatory lint first, then `next build --turbopack --no-lint` with Next.js TypeScript checking unchanged.
- Add timestamped phase start/end/failure messages and periodic elapsed-time/resource observations to the build runner. Preserve nonzero exit status and catchable cancellation signals.
- Save Docker build stdout/stderr in a private, per-attempt `.deploy-logs/` file, use plain progress, report the path and prevent service replacement on build/logging failure.
- Exclude host logs from Git, Docker context and source delivery. Preserve independent service scopes, CPU limits, application settings, ports, secrets and SQLite behavior.
- Document server execution in tmux and how to retrieve the automatically saved log. This does not claim the original long wait/cancellation root cause has been proven or introduce prebuilt images.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `deployment`: sequential build checks and private build diagnostics.

## Impact

Build runner/package command, deployment pipeline, exclusions, tests and current operations documentation. No commerce/UI/schema changes and no secret configuration changes. Docker continues to call `pnpm build`; direct raw Next.js invocations remain outside the supported deployment path.
