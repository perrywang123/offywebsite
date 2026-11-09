## ADDED Requirements

### Requirement: Shared shipping announcement

The shared Header shipping promotion SHALL read `OFFY GOES GLOBAL · WORLDWIDE SHIPPING FROM $15 USD` for all visitor markets. It SHALL replace the previous flat-rate country-list message while preserving the separate gift promotion, existing rotation, black background, white text and responsive wrapping.

#### Scenario: Shipping announcement is displayed

- **WHEN** the Header rotation displays its shipping promotion on any public page
- **THEN** the approved FROM wording is shown without the former country list or MORE REGIONS COMING SOON claim

## MODIFIED Requirements

### Requirement: About and support content

/about SHALL use Meet Who You Love to Be, the current twelve story paragraphs, future-IP cards and collaboration content. Retired team and stockists sections SHALL NOT render. FAQ SHALL contain eleven structured English answers in three parts, native details/summary and question numbering restarted per part. Shipping Q1 SHALL be `How much does shipping cost?` with three paragraphs: `We ship worldwide for $15 USD per order.`, `For US deliveries only, shipping is $20 USD when you order 3 or more OFFYs.`, and `Shipping is charged once per order.` The previous five Shipping questions SHALL become Q2–Q6 without answer changes; the other two parts SHALL remain unchanged. Questions SHALL be collapsed by default and FAQ structured data SHALL contain the same eleven questions and answers.

#### Scenario: FAQ formatting

- **WHEN** an answer is expanded
- **THEN** its paragraphs and bold segments match the current FaqPart data rather than an unformatted plain-text paragraph

#### Scenario: Shipping-cost question

- **WHEN** the FAQ page first loads
- **THEN** Shipping starts with the collapsed approved Q1 followed by the previous dispatch question as Q2, with all three exact answer paragraphs available on expansion
