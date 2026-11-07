## MODIFIED Requirements

### Requirement: Isolated build CPU budget

All server deployment image builds SHALL explicitly select a project-specific docker-container BuildKit builder. The builder SHALL enforce a shared CPU CFS budget defaulting to one CPU across storefront/admin build tasks, with a validated host-only `DEPLOY_BUILD_CPUS` override. OCI build parallelism SHALL be one. The builder SHALL also enforce a hard memory ceiling defaulting to 1536 MiB with a validated host-only `DEPLOY_BUILD_MEMORY_MB` override from 512 to 16384 MiB. Its total memory-plus-swap limit SHALL equal its memory limit. Running application/worker service resource settings, public ports, persistent business volumes, and independent admin deployment scope SHALL remain unchanged. The builder SHALL load built images to the local Docker image store and preserve its private build cache between releases without changing the user's global default builder.

#### Scenario: Full release on a two-core server

- **WHEN** the operator executes the existing full deployment command
- **THEN** both requested image builds use the same explicitly selected builder with one aggregate CPU and bounded memory by default, and service replacement starts only after successful capped builds and existing backups

#### Scenario: Independent backend release

- **WHEN** the operator deploys only the management system
- **THEN** only admin is built using the capped CPU/memory builder, and the storefront is not rebuilt or restarted

#### Scenario: Builder memory exceeded

- **WHEN** a build exceeds the dedicated builder's memory limit
- **THEN** the build can fail within its cgroup without removing limits or replacing the storefront as a recovery action

### Requirement: Verified build isolation preflight

Deployment SHALL check Compose builder selection support, Buildx automatic image-load support, and Docker CPU quota/period, memory and swap limit support. Existing dedicated builder configuration and its bootstrapped container's actual driver/CPU/memory/swap limits SHALL be verified before submitting image builds. Linux preflight SHALL require available host memory to exceed the configured builder memory by at least 512 MiB. Unsupported capability, insufficient headroom or drift SHALL fail before any image build, application replacement or database migration, with no silent fallback to an unrestricted builder. Check-only SHALL not create, start, update or remove builders or their caches. This guarantee SHALL apply to builds newly started by the updated pipeline, not previously running host processes, unrelated builders or Docker daemon work outside the builder cgroup.

#### Scenario: Unsupported engine or modified builder

- **WHEN** resource limit support is unavailable or a dedicated builder's declared/actual limits do not match the configured budget
- **THEN** deployment fails before building/replacing services and leaves existing builders, caches and applications intact

#### Scenario: Read-only preflight

- **WHEN** an operator runs `--check` on an unprepared server
- **THEN** version/capability checks and the planned budget are reported without creating or bootstrapping the dedicated builder

#### Scenario: Insufficient available memory

- **WHEN** Linux has less available memory than the builder budget plus 512 MiB
- **THEN** deployment stops before starting a builder or changing application services

#### Scenario: Memory configuration drift

- **WHEN** the dedicated builder's declared or actual memory or swap limits differ
- **THEN** deployment refuses the build and preserves existing services and caches

## ADDED Requirements

### Requirement: Block competing legacy host services

Before check-only succeeds or deployment creates a builder, pulls Git or replaces services, the pipeline SHALL reject either `offy.service` or `offy-website.service` when active, activating, reloading, deactivating or enabled for automatic startup. Failed and disabled units SHALL not block Docker deployment. The error SHALL identify the unit without changing it automatically.

#### Scenario: Legacy automatic build loop

- **WHEN** the enabled `offy-website.service` is repeatedly failing in its build-before-start phase
- **THEN** both deployment and check-only refuse before building or replacing services and name the conflicting service

### Requirement: Git revision image evidence

Server Git deployments SHALL supply the current checkout commit as `OFFY_BUILD_REVISION` on each Git re-execution, and resulting images SHALL expose that value as the OCI revision label. Non-Git prepared source MAY use `unknown`. The label SHALL not include credentials or require changing storefront runtime configuration.

#### Scenario: Admin-only Git publication

- **WHEN** the operator deploys the management system from the server Git checkout
- **THEN** the admin image's OCI revision identifies the checked-out commit and the running storefront image is preserved
