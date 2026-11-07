# Why

Production has an enabled legacy `offy-website.service` that repeatedly builds on the host, bypassing Docker CPU isolation. The Docker builder has no memory ceiling, and deployed images cannot be traced to a Git revision. Admin must be updated without replacing the running storefront.

# What Changes

- Cap the dedicated builder at 1536 MiB by default, with swap disabled for that builder, and verify actual limits before building.
- Require 512 MiB of additional available host memory before starting a build on Linux.
- Reject active, activating, restarting or enabled legacy `offy` / `offy-website` units, including check-only; never automatically stop them.
- Stamp images with the Git revision supplied by the server Git deployment pipeline.
- Preserve independent admin deployment, shared data backup and storefront container lifecycle.

# Capabilities

## Modified Capabilities

- `deployment`: verified resource isolation, legacy service guard and release revision evidence.

# Impact

Deployment scripts, Docker image metadata, deployment tests and operations documentation. No storefront application behavior, ports, production credentials or schema changes. Production admin publication uses Git-pulled code and is verified against the unchanged storefront container.
