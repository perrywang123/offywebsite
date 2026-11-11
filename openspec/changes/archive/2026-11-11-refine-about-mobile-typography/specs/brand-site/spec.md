## ADDED Requirements

### Requirement: Mobile About editorial hierarchy

Below 768px, About SHALL left-align the title and manifesto within consistent reading gutters. The first three statements SHALL be visually stronger than the long closing paragraph, without changing their wording or order. Story prose SHALL use a consistent readable body scale, clear numbered chapter headings and subordinate supporting labels; paragraph and quotation spacing SHALL distinguish content groups. Both pages SHALL preserve native semantic text, artwork, routes and desktop composition. Text SHALL wrap naturally without truncation or horizontal overflow at 320px and enlarged text sizes.

#### Scenario: Read the About invitation on a phone

- **WHEN** a visitor reads About at 375px width
- **THEN** all four paragraphs share a stable left edge, opening statements are distinct from the closing explanation, and the existing image pair and story link follow in source order

#### Scenario: Read story on a narrow screen

- **WHEN** a visitor reads the story at 320px or increases text size
- **THEN** body copy, supporting labels and headings retain a clear hierarchy without clipping or image overlap and all return links remain available
