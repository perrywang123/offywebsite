## MODIFIED Requirements

### Requirement: Safe country database refresh

A valid optional external Country database SHALL be usable independently of application rebuilds. Missing credentials or an absent/invalid external database SHALL NOT prevent storefront startup. Download credentials SHALL remain private and SHALL NOT enter client code, image layers, logs or Git. The updater SHALL preserve the last valid database on failure and SHALL NOT modify products, orders or payments. The companion SHALL check immediately on first start and every 72 hours thereafter, downloading only when necessary. Starting it SHALL NOT build or restart the storefront, management application or commerce workers.

#### Scenario: Refresh unavailable

- **WHEN** enrollment is incomplete or a refresh fails
- **THEN** the current valid lookup remains usable and timezone/language/US fallback continues to work

#### Scenario: Low-frequency isolated updates

- **WHEN** an operator starts the Country database companion with valid private credentials
- **THEN** only the updater service starts, an initial check runs immediately and subsequent checks occur every 72 hours without rebuilding or restarting commerce services
