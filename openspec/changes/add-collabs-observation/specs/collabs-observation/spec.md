## ADDED Requirements

### Requirement: Independent short link observations

The system SHALL record best-effort daily aggregate open requests for enabled Collabs short links after producing the existing redirect response. Counting SHALL NOT change the redirect target, tracking parameters or response status, and SHALL NOT invoke local commission attribution. HEAD, known prefetch and known preview/bot requests SHALL be excluded. Counting failures SHALL NOT prevent shopping.

#### Scenario: Valid short link opens while counting storage is unavailable

- **WHEN** an enabled alias resolves but the observation write fails
- **THEN** the same validated destination and original Collabs parameters are returned with the existing redirect behavior

### Requirement: Honest link metrics

The authenticated workspace SHALL show open request totals, daily trends, last open time and the collection start. The system SHALL label these as Offy observations, not unique people or official Collabs Visits. Uncollected history SHALL remain unknown. Raw IP addresses and full User-Agent values SHALL NOT be persisted by this capability.

#### Scenario: Administrator inspects an alias created before collection began

- **WHEN** the administrator views that link's observations
- **THEN** the collection start is visible and the uncollected period is not fabricated as zero visits

### Requirement: Contract-verified official attribution events

The system SHALL accept authenticated, idempotent official Collabs attribution events through Shopify Flow only after the actual trigger field contract is verified. It SHALL preserve source and receive times, separate native creator identity from alias and report identity, and retain unmapped events without guessing their ownership. Only actual supplied monetary fields SHALL be shown as official commission values.

#### Scenario: A repeated event lacks commission data or a known creator mapping

- **WHEN** the same official event is delivered repeatedly
- **THEN** it is not double counted, absent commission remains not provided and unresolved identity is visible for review

### Requirement: Cumulative snapshots retain their real meaning

The system SHALL retain only the verified Flow trigger fields. Official cumulative visits and order counts SHALL be labeled as event-time snapshots, not continuously refreshed or period-filtered totals. Cumulative cents fields without a supplied currency SHALL remain raw fields and SHALL NOT be formatted as a guessed currency, a per-order commission or a payout.

#### Scenario: Official cumulative commission arrives without currency

- **WHEN** the event contains commissionCumulativeCents but no currency
- **THEN** the workspace preserves its raw value, identifies the missing currency and directs financial reconciliation to official reports

### Requirement: Non-persistent integration validation

The authenticated receiver SHALL support an explicitly requested validation-only mode with the same input contract and body size limits. This mode SHALL NOT open or mutate the database and SHALL identify the response as validation only.

#### Scenario: An administrator tests Flow's rendered request

- **WHEN** an authorized valid request uses validate=1
- **THEN** the receiver confirms validation without creating attribution, creator or visit observations

### Requirement: Separate evidence and settlement boundaries

The system SHALL separate official attribution events, Shopify order facts, Offy link observations and imported report snapshots. It SHALL NOT infer creator payouts from paid orders, recompute authoritative commission, sum overlapping sources or change native Collabs payments. Historical backfill and unsupported financial fields SHALL remain explicitly limited to available official evidence.

#### Scenario: A received attribution order is later refunded

- **WHEN** a read-only order check detects the refund
- **THEN** the refund fact is shown for reconciliation without asserting that the official commission was canceled or that any creator payout changed
