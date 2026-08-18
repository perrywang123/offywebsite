# Newsletter Subscription Specification

## Purpose
Allow visitors to subscribe to brand updates by submitting an email address, which is validated, normalized, and stored exactly once.

## Requirements

### Requirement: Subscribe with a valid email
The system SHALL accept a syntactically valid email, normalize it (trim + lowercase), and store it exactly once.

#### Scenario: New subscriber
- **WHEN** a visitor submits a valid email
- **THEN** the email is stored and the API returns HTTP 201

#### Scenario: Invalid email
- **WHEN** a visitor submits an email that fails validation
- **THEN** the API returns HTTP 400 and stores nothing

#### Scenario: Duplicate email
- **WHEN** a visitor submits an already-subscribed email
- **THEN** the API returns HTTP 409 and does not create a duplicate row
