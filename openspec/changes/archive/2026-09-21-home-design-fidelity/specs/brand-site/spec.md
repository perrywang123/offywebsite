## MODIFIED Requirements

### Requirement: Homepage renders brand content
The homepage SHALL present the is.offy™ brand (黑皮 OFFY · 37 个化身) with the
following section order: hero carousel → promo bar → news → shop by category
(centered title group merged with latest looks) → upcoming series teaser →
collab (14 OF looks) → future IPs → newsletter. Brand copy uses "让想象落地，让陪伴发生"
and "仪式感生活" messaging.

#### Scenario: Visitor loads the homepage
- **WHEN** a visitor requests `/`
- **THEN** the server returns HTTP 200 with the hero carousel, merged category+looks section, latest looks cards, and newsletter section

#### Scenario: Category tiles link to category pages
- **WHEN** a visitor clicks a product card in the merged category section
- **THEN** they land on that product's detail page

#### Scenario: Brand sections are present
- **WHEN** the homepage renders
- **THEN** it contains a news section, a teaser section, a collab section, a newsletter section, and a contact footer

### Requirement: News module
The homepage SHALL render the news section as an editorial asymmetric layout: one
large feature card on the left (新品上市 badge + 仪式感生活 headline + 查看详情
button) and a 2×2 grid of four smaller cards on the right, followed by a
"逛全部系列" CTA linking to the products page.

#### Scenario: News cards render
- **WHEN** the homepage renders
- **THEN** 1 feature card + 4 secondary cards render with images and localized titles

#### Scenario: Browse-all CTA
- **WHEN** the user clicks 逛全部系列
- **THEN** they navigate to the products page

### Requirement: Teaser section for upcoming series
The homepage SHALL render the teaser section with a centered title group
(OFFY 新品抢先看 / 更多新品，敬请期待) and a left-text right-image layout:
the left column shows 接下来 / /时尚包挂系列 / 具体发布时间以 INS 为准 and a
查看详情 button; the right column shows the teaser hero image. No preview-image
grid is rendered.

#### Scenario: Teaser renders
- **WHEN** the homepage renders
- **THEN** the centered title, left text column with CTA, and teaser hero image appear
