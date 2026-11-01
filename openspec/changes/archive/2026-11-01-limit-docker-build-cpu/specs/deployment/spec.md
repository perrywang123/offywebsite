## ADDED Requirements

### Requirement: Isolated build CPU budget

All server deployment image builds SHALL explicitly select a project-specific docker-container BuildKit builder. The builder SHALL enforce a shared CPU CFS budget defaulting to one CPU across storefront/admin build tasks, with a validated host-only `DEPLOY_BUILD_CPUS` override. OCI build parallelism SHALL be one. Running application/worker service resource settings, public ports, persistent business volumes, and independent admin deployment scope SHALL remain unchanged. The builder SHALL load built images to the local Docker image store and preserve its private build cache between releases without changing the user's global default builder.

#### Scenario: Full release on a two-core server

- **WHEN** the operator executes the existing full deployment command
- **THEN** both requested image builds use the same explicitly selected builder with one aggregate CPU by default and service replacement starts only after successful capped builds and existing backups

#### Scenario: Independent backend release

- **WHEN** the operator deploys only the management system
- **THEN** only admin is built using the same capped builder and the storefront is not rebuilt or restarted

### Requirement: Verified build isolation preflight

Deployment SHALL check Compose builder selection support, Buildx automatic image-load support, and Docker CPU quota/period support. Existing dedicated builder configuration and its bootstrapped container's actual driver/CPU quota/period SHALL be verified before submitting image builds. Unsupported capability or drift SHALL fail before any image build, application replacement or database migration, with no silent fallback to an unrestricted builder. Check-only SHALL not create, start, update or remove builders or their caches. This guarantee SHALL apply to builds newly started by the updated pipeline, not previously running host processes, unrelated builders or Docker daemon work outside the builder cgroup.

#### Scenario: Unsupported engine or modified builder

- **WHEN** quota support is unavailable or a dedicated builder's declared/actual limits do not match the configured budget
- **THEN** deployment fails before building/replacing services and leaves existing builders, caches and applications intact

#### Scenario: Read-only preflight

- **WHEN** an operator runs `--check` on an unprepared server
- **THEN** version/capability checks and the planned budget are reported without creating or bootstrapping the dedicated builder
