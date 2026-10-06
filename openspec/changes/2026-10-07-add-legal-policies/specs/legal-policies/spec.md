## ADDED Requirements

### Requirement: Legal policy pages

The site SHALL serve five legally-required pages under `/[locale]/policies/[handle]`, where
`handle` is restricted to the whitelist `returns`, `privacy`, `terms`, `shipping`, `contact`.
The four policy bodies (`returns` → `shop.refundPolicy`, `privacy` → `shop.privacyPolicy`,
`terms` → `shop.termsOfService`, `shipping` → `shop.shippingPolicy`) SHALL be read from the
Shopify Storefront API in a single query issued with the `ck=shop-policies` cache-key guard
and a `revalidate` of 300 seconds, and SHALL be sanitized through a tag/attribute whitelist
before rendering. `contact` SHALL be rendered from in-tree structured content (the Storefront
API exposes no contact-information field). A `handle` outside the whitelist MUST return 404 —
never a 200 page with an empty body. Display names SHALL come from the `policies.titles.*`
i18n keys so that the footer entry and the page heading can never diverge.

#### Scenario: Policy body is fetched and sanitized

- **WHEN** a visitor requests `/en/policies/privacy`
- **THEN** the response is 200, contains an `<h1>` whose text is the English display name,
  and the article contains the policy text returned by `shop.privacyPolicy` with every
  `class` attribute stripped and no `script`/`style` element present

#### Scenario: Unknown handle is rejected

- **WHEN** a visitor requests `/en/policies/legal-notice` or `/en/policies/unknown`
- **THEN** the response status is 404

#### Scenario: Shopify is unreachable

- **WHEN** the Storefront query fails or returns an empty body for a known handle
- **THEN** the page still renders 200 with its heading, the footer and contact entry points
  intact, and an inline "text could not be loaded" notice — it MUST NOT render a blank
  article or a 404

### Requirement: Policy language handling

Because the Shopify policy bodies exist in English only (`@inContext(language:)` returns
byte-identical English for `EN` and `ZH_CN`), the Chinese locale SHALL render a Chinese page
shell around the English body and SHALL display a language notice stating that the English
text is the authoritative version and that the Chinese page is not a translation. The policy
article SHALL carry `lang="en"` so assistive technology does not read it with Chinese
phonetics. The English locale MUST NOT display the Chinese notice. The policy text MUST NOT
be machine-translated.

#### Scenario: Chinese locale shows the notice and marks the body as English

- **WHEN** a visitor requests `/zh/policies/privacy`
- **THEN** the page contains the Chinese language notice text and the article element carries
  `lang="en"`

#### Scenario: English locale omits the Chinese notice

- **WHEN** a visitor requests `/en/policies/privacy`
- **THEN** the page does not contain the Chinese notice text

### Requirement: Contact information page

The `contact` policy page SHALL render the company's contact details as a structured
definition list rather than as a single prose paragraph, using the values supplied by the
business verbatim in English (entity name and company number, registered office, customer
support email, Instagram handle), plus the supplied intro and response-time note. The support
email SHALL be a `mailto:` link; the Instagram entry SHALL be an external link carrying
`rel="noopener noreferrer"`. The Chinese locale SHALL translate only the field labels, never
the values.

#### Scenario: Contact details are present and actionable

- **WHEN** a visitor requests `/en/policies/contact`
- **THEN** the page contains `Whimcore Cultural Creative Co., Limited`, the company number
  `81264514`, the registered office address, `contact@whimcoreofficial.com` and `@isoffy`,
  the email is an `a[href^="mailto:contact@whimcoreofficial.com"]`, and the Instagram link
  carries `rel="noopener noreferrer"`
