## MODIFIED Requirements

### Requirement: Honest link metrics

The authenticated workspace SHALL show open request totals, daily trends, last open time and the collection start. The system SHALL label these as Offy observations, not unique people or official Collabs Visits. Uncollected history SHALL remain unknown in the data contract and chart. The daily request-count table SHALL render missing counts as numeric 0 at the owner's request, with an adjacent explanation that this means no recorded requests and does not prove zero historical visits. Raw IP addresses and full User-Agent values SHALL NOT be persisted by this capability.

#### Scenario: Administrator inspects an alias created before collection began

- **WHEN** the administrator views that link's observations
- **THEN** the collection start and unknown chart period are visible, while the daily table shows missing request counts as 0 with a display-only explanation
