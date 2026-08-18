# Brand Site Specification

## Purpose
The public marketing site for the Offy brand: a responsive homepage that communicates brand identity, product highlights, and contact information.

## Requirements

### Requirement: Homepage renders brand content
The homepage SHALL render a hero, brand highlights, a newsletter section, and a contact footer without requiring authentication.

#### Scenario: Visitor loads the homepage
- **WHEN** a visitor requests `/`
- **THEN** the server returns HTTP 200 with the brand hero and navigation

#### Scenario: Brand sections are present
- **WHEN** the homepage renders
- **THEN** it contains an about section, a newsletter section, and a contact footer

### Requirement: Health endpoint
The site SHALL expose a liveness endpoint for monitoring.

#### Scenario: Health check
- **WHEN** a monitor requests `/api/health`
- **THEN** the server returns HTTP 200 with a JSON `status: "ok"` payload
