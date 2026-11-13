## ADDED Requirements

### Requirement: Explicit archived observation scope

The administrator workspace SHALL exclude archived cooperation records and tracking groups used only by archived records from default link and landing observations. It SHALL provide an explicit option to include archived observation history without deleting or redistributing counts. A tracking group still used by a nonarchived historical duplicate SHALL retain its complete original aggregate. Official attribution and financial evidence SHALL remain separately visible regardless of this observation filter.

#### Scenario: All aliases sharing a test tracking ID are archived

- **WHEN** the normal workspace loads or changes its observation period
- **THEN** the test tracking group and archived short links are absent by default, while including archived observations restores the original counts

#### Scenario: Only one of two legacy duplicate aliases is archived

- **WHEN** one nonarchived record still references the same tracking ID
- **THEN** the group remains visible with its original complete aggregate and no claim that historical views can be split between aliases
