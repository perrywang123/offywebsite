## MODIFIED Requirements

### Requirement: Informational shipping copy in the bag drawer

A verified nonempty bag drawer SHALL display `Worldwide shipping: $15 USD per order.` followed by `For US orders of 3+ OFFYs, shipping is $20 USD.` below its Subtotal and above Checkout. The two statements SHALL form one visual group with a decorative outline cart icon and a subtle vertical divider; the icon SHALL be hidden from assistive technology, text SHALL wrap within narrow drawers, and the existing Checkout control SHALL remain visible and operable. Both statements SHALL remain the same across visitor markets and quantities. They SHALL NOT add shipping to the subtotal, convert the quoted USD amounts to the product currency, calculate the final fee or change checkout inputs. Shopify retains final shipping authority based on destination and eligible paid items; gifts are excluded from that business quantity. Empty and unavailable bag states SHALL remain unchanged.

#### Scenario: A bag in a non-USD market

- **WHEN** a verified GBP bag is opened with one or three items
- **THEN** both approved USD informational statements are shown while Subtotal remains the verified GBP merchandise subtotal without shipping

#### Scenario: A US bag reaches the quantity threshold

- **WHEN** a verified USD bag contains three or more items
- **THEN** the same two statements are displayed, without a client-calculated shipping charge or any change to the checkout request

#### Scenario: Narrow drawer layout

- **WHEN** the nonempty bag is opened at a 320px or 375px viewport
- **THEN** the icon, divider and copy fit without horizontal overflow, text wraps naturally and the Checkout action remains within the drawer viewport
