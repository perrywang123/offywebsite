## ADDED Requirements

### Requirement: Collabs accounting mode cutover

The system SHALL support an explicit Collabs accounting mode that supersedes new Offy session-only attribution, local code issuance and manual financial settlement while preserving historic records. Legacy mutation endpoints and workers SHALL enforce the accounting boundary independently of UI visibility. Existing installations SHALL retain legacy behavior until explicit cutover.

#### Scenario: Old client requests manual settlement after cutover

- **WHEN** a client calls a legacy code or financial mutation endpoint in Collabs mode
- **THEN** it is rejected with a clear externally-managed reason and no new code, commission or local payment is created

#### Scenario: Existing signed referral arrives after cutover

- **WHEN** a new checkout in Collabs mode includes an old Offy referral ticket
- **THEN** the checkout does not create another local commission obligation and ordinary purchasing remains possible
