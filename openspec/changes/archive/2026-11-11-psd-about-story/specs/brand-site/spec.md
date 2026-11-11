## MODIFIED Requirements

### Requirement: About and support content

/about SHALL render the current owner-supplied About PSD as a brand invitation: Where She Came From, its four manifesto paragraphs, the complete OFFY illustration paired with the original Gia portrait, and the EXPLORE OUR STORY link to /our-story. The previous long story, future-IP, collaboration and retired stockists blocks SHALL NOT render on /about. The user-supplied creator narrative belongs on /our-story; it SHALL NOT restore the retired The Makers block. FAQ SHALL contain eleven structured English answers in three parts, native details/summary and question numbering restarted per part. Shipping Q1 SHALL be `How much does shipping cost?` with three paragraphs: `We ship worldwide for $15 USD per order.`, `For US deliveries only, shipping is $20 USD when you order 3 or more OFFYs.`, and `Shipping is charged once per order.` The previous five Shipping questions SHALL become Q2–Q6 without answer changes; the other two parts SHALL remain unchanged. Questions SHALL be collapsed by default and FAQ structured data SHALL contain the same eleven questions and answers.

#### Scenario: FAQ formatting

- **WHEN** an answer is expanded
- **THEN** its paragraphs and bold segments match the current FaqPart data rather than an unformatted plain-text paragraph

#### Scenario: Shipping-cost question

- **WHEN** the FAQ page first loads
- **THEN** Shipping starts with the collapsed approved Q1 followed by the previous dispatch question as Q2, with all three exact answer paragraphs available on expansion

#### Scenario: About story invitation

- **WHEN** a visitor opens /about
- **THEN** the four supplied manifesto paragraphs and original paired images are visible, with an EXPLORE OUR STORY link to /our-story and no obsolete About modules

## ADDED Requirements

### Requirement: PSD story narrative and navigation

/our-story SHALL preserve the complete current IP story PSD narrative and source artwork in its original sequence: black-and-white banner, creator introduction and quote, OFFY origin and Briar Island, four sketch panels, three first-person reflections, and collection/IP notice. Narrative SHALL be native semantic HTML, with one h1, numbered h2 chapters, h3 subheadings and a blockquote. The source's repeated World of OFFY chapter title and two different Gia passages SHALL remain. Clear accidental text artifacts MAY be corrected without rewriting the story. Mobile SHALL reflow the creator section and sketch panels into a readable single column and separate the large prototype from the character roster; text SHALL not be baked into a long-page image or clipped by fixed heights.

Both pages SHALL preserve the shared storefront shell, use their own canonical/OG metadata, and keep the content visible without JavaScript animation. /our-story SHALL be listed in the sitemap and offer top/bottom Back to About links that work after direct entry.

#### Scenario: Read the full story

- **WHEN** EXPLORE OUR STORY is activated by pointer or keyboard
- **THEN** the real /our-story page loads with all supplied narrative and original assets, and Back to About returns to /about

#### Scenario: Mobile narrative and large text

- **WHEN** the pages are viewed at 320px or text is enlarged to 200%
- **THEN** paragraphs remain readable without horizontal overflow or image/text overlap, artwork preserves its aspect ratio, and the CTA and return links remain operable

#### Scenario: Independent metadata

- **WHEN** either page is indexed or shared
- **THEN** it supplies its own canonical path, descriptive title and page-relevant Open Graph content instead of inheriting the homepage canonical
