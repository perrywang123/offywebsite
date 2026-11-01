## ADDED Requirements

### Requirement: Sequential mandatory build checks

The supported `pnpm build` command used by Docker SHALL complete the existing lint command before starting the Next.js production build. Only duplicate Next.js lint execution SHALL be disabled; Next.js production TypeScript checking SHALL remain enabled. Lint failure SHALL prevent compilation, and compilation/type failure or catchable cancellation SHALL return a nonzero result. Builds SHALL emit timestamped phase starts, ends, elapsed time and failure status, with periodic progress while waiting. Resource observations SHALL identify their scope, tolerate unavailable platform counters, and SHALL NOT be presented as proof of a performance root cause.

#### Scenario: Lint succeeds

- **WHEN** the operator invokes the supported production build
- **THEN** lint finishes before Next.js starts, Next.js still checks generated/application types, and success is reported only after both phases complete

#### Scenario: Validation or cancellation failure

- **WHEN** lint, compilation or TypeScript checking fails, or a catchable cancellation interrupts a phase
- **THEN** the build reports the affected phase and nonzero outcome and never proceeds to a later phase or successful deployment

### Requirement: Private persistent Docker build diagnostics

Real deployment SHALL save each Docker build attempt's combined stdout/stderr and plain progress to a distinct private log under `.deploy-logs/`, print its location and maintain a latest-build reference. The directory SHALL be mode 0700 and files mode 0600. Docker build failure/cancellation and log-output failure SHALL prevent database backup/service replacement from proceeding. Log artifacts SHALL be excluded from Git, Docker context and source delivery. Check-only SHALL not create deployment logs. Logging SHALL NOT print private runtime configuration or imply that foreground builds survive terminal disconnection; operators SHALL be given tmux execution/reconnection instructions.

#### Scenario: Failed Docker build

- **WHEN** an image build emits diagnostics and exits nonzero
- **THEN** its output and exit status are retained privately, the log path is reported, and no backup/service replacement starts

#### Scenario: Check-only or source delivery

- **WHEN** preflight is check-only or project source is packaged/synchronized
- **THEN** check-only creates no persistent build log and delivery excludes existing private build logs
