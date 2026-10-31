# Legal Policies Specification

## Purpose

Record implemented policy/support behavior as of 2026-10-31; this is product documentation, not a new legal text.

## Requirements

### Requirement: Legal policy pages

The site SHALL serve /policies and the whitelisted handles returns, privacy, terms, shipping and contact. Unknown handles SHALL return 404. Four written bodies SHALL be read together from Shopify shop refundPolicy/privacyPolicy/termsOfService/shippingPolicy, using ck=shop-policies and fetch revalidate=300. HTML SHALL pass the existing tag/attribute whitelist before rendering.

#### Scenario: Shopify policy failure

- **WHEN** a known policy cannot be read
- **THEN** the current page remains 200 with its heading and a visible unavailable notice rather than a fabricated legal body

### Requirement: Policy directory and language

The directory SHALL list four written policies and exclude contact. Public pages SHALL use the active English locale and unprefixed paths. Reserved zh branches SHALL show a language notice around English bodies if later re-enabled, but SHALL NOT be described as currently routed Chinese pages. Policy text SHALL not be machine-translated.

#### Scenario: English policy

- **WHEN** a shopper visits /policies/privacy
- **THEN** the body uses lang=en, English navigation and its own canonical, without a Chinese-language notice

### Requirement: Contact information page

Contact SHALL use structured local content because the Storefront API wrapper has no contact field. Values SHALL use Whimcore Cultural Creative Co., Limited, Company No. 81264514, the configured Hong Kong office, contact@whimcoreofficial.com and @is.offy. Email SHALL be actionable and Instagram SHALL use a safe external link.

#### Scenario: Support contact

- **WHEN** /policies/contact renders
- **THEN** its definition list includes the current company values, mailto support link and https://www.instagram.com/is.offy
