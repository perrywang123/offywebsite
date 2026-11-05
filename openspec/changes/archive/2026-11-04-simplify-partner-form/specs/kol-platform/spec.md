## MODIFIED Requirements

### Requirement: Versioned KOL cooperation

The system SHALL support stable unique aliases, required custom commission from 0 to 100 percent with at most two decimals, versioned terms and dates, pause/end state, contract/video references and immutable audits. New KOL links SHALL not require deployment. The management form SHALL require only one KOL name input and generate a unique reserved referral alias on the server, including duplicate and non-Latin names; editing a name SHALL preserve the existing alias and past attribution. Explicit aliases from existing API clients SHALL remain supported and immutable. Social profile URLs SHALL be optional, and non-empty values SHALL be valid HTTPS URLs. The form SHALL distinguish the generated referral link from its shopping destination, offer existing home/products destinations and preserve valid legacy destinations on edit. Failed validation SHALL show actionable field-specific reasons rather than only a generic failure.

#### Scenario: Rate changes after checkout

- **WHEN** an administrator changes a cooperation rate after a checkout was created
- **THEN** the existing checkout retains its original version and rate and future checkouts use the new valid terms

#### Scenario: Create without alias or social profile

- **WHEN** an administrator provides a KOL name and valid cooperation terms without an alias or social profile URL
- **THEN** creation succeeds with a unique fixed referral alias and an empty profile, including when another KOL has the same name

#### Scenario: Rename an existing cooperation

- **WHEN** an administrator changes the name or terms of an existing KOL without supplying a new alias
- **THEN** the original referral link remains unchanged and the new terms are versioned

#### Scenario: Invalid shopping destination

- **WHEN** a client submits `/maya` as a destination or an invalid non-empty profile URL
- **THEN** no cooperation is created and the administrator can identify the failing field and how to correct it
