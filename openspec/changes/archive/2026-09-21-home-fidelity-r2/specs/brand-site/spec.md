## MODIFIED Requirements

### Requirement: Homepage renders brand content
The homepage SHALL present the is.offy™ brand (黑皮 OFFY · 37 个化身) with the
following section order: hero carousel → promo bar → news → shop by category
(centered title group + latest looks + regional-exclusive group + product-summary
roster) → upcoming series teaser → collab (14 OF looks) → future IPs → newsletter.
Brand copy uses "让想象落地，让陪伴发生" and "仪式感生活" messaging.

#### Scenario: Visitor loads the homepage
- **WHEN** a visitor requests `/`
- **THEN** the server returns HTTP 200 with the hero carousel, merged category section, and newsletter section

#### Scenario: Category tiles link to category pages
- **WHEN** a visitor clicks a product card in the merged category section
- **THEN** they land on that product's detail page

#### Scenario: Regional-exclusive group
- **WHEN** the merged category section renders
- **THEN** after the latest-looks grid, a 「区域限定:」 group shows the badge-marked
  products (CPL02/CPL08 → AVAILABLE IN THE U.S. ONLY, FLS10 → AVAILABLE IN THE UK ONLY)
  with red flag badges on the cards

#### Scenario: Product-summary roster inside the category section
- **WHEN** the merged category section renders
- **THEN** after the regional group, a 「产品汇总-选购同款造型:」 label and the
  circular-avatar roster of all products appear; no separate roster section exists
  later on the page

#### Scenario: Brand sections are present
- **WHEN** the homepage renders
- **THEN** it contains a news section, a teaser section, a collab section, a newsletter section, and a contact footer

### Requirement: Teaser section for upcoming series
The homepage SHALL render the teaser section with a centered title group
(OFFY 新品抢先看 / 更多新品，敬请期待) above a full-bleed panel: the teaser hero
image fills the panel as background, the left column overlays 接下来 /
/时尚包挂系列 / 具体发布时间以 INS 为准 and a solid black pill 查看详情 button.

#### Scenario: Teaser renders
- **WHEN** the homepage renders
- **THEN** the centered title, background hero image, left overlay text, and black pill CTA appear

## REMOVED Requirements

### Requirement: Footer wordmark signature
The footer SHALL display the is.offy™ wordmark as a full-width signature above
the link columns.

#### Scenario: Wordmark spans the container
- **WHEN** the footer renders on desktop
- **THEN** the wordmark stretches to the full container width and reads "is.offy™"

**Reason**: 用户验收确认去除全宽字标,页脚仅保留链接列与版权细条。
