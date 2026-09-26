## ADDED Requirements

### Requirement: Bag charm teaser detail page
A route `/[locale]/bag-charm` SHALL render the fashionable bag charm series teaser
detail page per the design draft: a hero area with the oversized two-line English
title "FASHIONABLEBAG CHARM COLLECTION", a large left image and a tall right image
(both derived from the teaser hero photo), a title block (时尚包挂系列 /
更多都市精灵，敬请期待), and a 3-column grid of 6 teaser product cards coded
WCOFFY-XXX01..06, each with a 「点击查看」 link to the products page.

#### Scenario: Teaser page renders
- **WHEN** a visitor opens `/zh/bag-charm`
- **THEN** the hero title, two hero images, title block, and 6 coded teaser cards render

#### Scenario: Card CTA navigates to products
- **WHEN** a visitor clicks 点击查看 on a teaser card
- **THEN** they navigate to the products page

#### Scenario: Homepage teaser button links here
- **WHEN** a visitor clicks 查看详情 in the homepage teaser section
- **THEN** they navigate to `/[locale]/bag-charm`
