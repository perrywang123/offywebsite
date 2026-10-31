# Newsletter Specification

## Purpose

Record the implemented email subscription capture, baseline 2026-10-31. Capturing an address does not implement email delivery or a marketing automation integration.

## Requirements

### Requirement: Subscription persistence

The API SHALL trim and lowercase a syntactically valid email and store it once in newsletter_subscribers. Unique email enforcement SHALL be in SQLite. The form SHALL show localized success, duplicate, invalid-email and network feedback.

#### Scenario: New subscription

- **WHEN** a new valid email is submitted
- **THEN** it is stored normalized and the API returns 201

#### Scenario: Invalid email

- **WHEN** input is invalid
- **THEN** the API returns 400 and stores nothing

#### Scenario: Duplicate email

- **WHEN** the normalized address already exists
- **THEN** the API returns 409 without a duplicate row
