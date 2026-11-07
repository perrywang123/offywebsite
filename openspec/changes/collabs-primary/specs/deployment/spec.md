## ADDED Requirements

### Requirement: Revision-verified prebuilt releases

The deployment pipeline SHALL support separately releasing the storefront or admin from a prebuilt local Docker image without compiling on the production host. It SHALL require the image revision label to equal the pulled Git HEAD, retain the normal configuration, database backup, migration and health checks, and reject missing or mismatched images before replacing a running service. Git re-execution SHALL preserve the prebuilt option.

#### Scenario: A stale image cannot replace the live storefront

- **WHEN** an operator selects a prebuilt image whose revision differs from the current checkout
- **THEN** deployment fails before database backup or service replacement
