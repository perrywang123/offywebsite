## ADDED Requirements

### Requirement: Informational shipping copy in the bag drawer

A verified nonempty bag drawer SHALL display `Worldwide shipping: $15 USD per order.` followed by `US deliveries only: $20 USD for 3+ OFFYs.` below its Subtotal and above Checkout. Both statements SHALL remain the same across visitor markets and quantities. They SHALL NOT add shipping to the subtotal, convert the quoted USD amounts to the product currency, calculate the final fee or change checkout inputs. Shopify retains final shipping authority based on destination and eligible paid items; gifts are excluded from that business quantity. Empty and unavailable bag states SHALL remain unchanged.

#### Scenario: A bag in a non-USD market

- **WHEN** a verified GBP bag is opened with one or three items
- **THEN** both approved USD informational statements are shown while Subtotal remains the verified GBP merchandise subtotal without shipping

#### Scenario: A US bag reaches the quantity threshold

- **WHEN** a verified USD bag contains three or more items
- **THEN** the same two statements are displayed, without a client-calculated shipping charge or any change to the checkout request
