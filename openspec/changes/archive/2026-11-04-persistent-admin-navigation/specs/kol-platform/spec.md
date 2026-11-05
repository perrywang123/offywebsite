## ADDED Requirements

### Requirement: Persistent management navigation

The management console SHALL use client-side navigation inside a persistent shared administrator layout. After initial authentication/data loading, switching valid sections SHALL preserve the navigation and existing local snapshot, refresh data in the background and keep partner, coupon, order and settlement filters independent. Direct section URLs and browser history SHALL remain supported, and unknown sections SHALL remain not found. Section changes SHALL close temporary dialogs. Failed background reads SHALL preserve the last data with an explicit stale-data warning; unauthorized responses SHALL clear it and return to login. Aborted or superseded reads SHALL not replace newer data or authorization state. Existing trusted-ingress checks and server-side authentication of every management API SHALL remain enforced. Checkout diagnostics SHALL retain their URL-based filtering and MAY show a section-local loading state without replacing the management frame.

#### Scenario: Switch between sections

- **WHEN** an authenticated administrator switches from partners to orders or another valid section
- **THEN** the same management frame remains mounted, the full-page connecting screen does not reappear and existing data remains visible while a fresh snapshot is requested

#### Scenario: Filters and history

- **WHEN** an administrator applies a partner search, switches to orders and returns using navigation or browser history
- **THEN** order filters remain independent and the partner search is restored

#### Scenario: Background read fails or session expires

- **WHEN** a background read fails with a transient error or returns unauthorized
- **THEN** a transient error keeps the prior snapshot with a clear warning, while unauthorized access clears the snapshot and shows login
