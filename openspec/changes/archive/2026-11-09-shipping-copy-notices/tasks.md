## Approved scope

- [x] Extract the two-page source PDF and receive owner approval for the announcement and drawer notices.
- [x] Receive the owner's final FAQ wording before changing FAQ content.
- [x] Validate the OpenSpec change before implementation.

## Implementation and validation

- [x] Add failing tests for the announcement replacement and fixed drawer notices, placement and unaffected currency subtotal.
- [x] Implement only the approved announcement and drawer text.
- [x] Add failing checks for the exact FAQ paragraphs, shifted numbering and generated structured data; implement the confirmed FAQ.
- [x] Run relevant and full tests, type/lint/format checks and a local production build.
- [x] Verify desktop and mobile pages using real Shopify read data, without production tracking or checkout creation; restore local shopping state.
- [x] Record screenshots, scope and the remaining Shopify shipping-rate check; archive only implemented deltas.

The FAQ scope uses the owner's final message, which supersedes the PDF's longer FAQ answer. Do not add the removed paid-item or complimentary-gift sentences to the displayed FAQ.
