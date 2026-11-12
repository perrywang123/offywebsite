# Why

The production audit found overlapping Offy/Shopify checkout events, missing ad hierarchy IDs, internal tests in the default view, and no local order linkage. Delivery receipts alone cannot prove ad attribution.

# What Changes

- Shopify exclusively owns Meta InitiateCheckout/Purchase. Offy records CheckoutReady locally; old checkout outbox jobs are suppressed with evidence retained.
- Preserve consented ad-source context and offer a copyable Meta URL-parameter template. Do not invent click IDs or infer ad attribution from UTM tags.
- Attach an optional signed, non-personal checkout reference to Shopify cart attributes. Read matching order facts through the existing Admin API credentials, with bounded incremental polling independent of CAPI success.
- Add dated, test-excluding diagnostics, a same-browser journey and Shopify order evidence, clearly separate from Meta-attributed revenue.
- Deliver concise and detailed operating SOPs and isolated end-to-end validation.

# Capabilities

Modified: meta-funnel. Added within that capability: signed checkout/order evidence, operator source template and cohort diagnostics.

# Impact

Marketing runtime, optional checkout metadata, Admin read-only queries, SQLite additive migration, existing Meta worker and authenticated admin UI. No price, inventory, destination, discount, payment, Collabs accounting or advertising-budget changes. No new products, ads or payments. Real paid-ad attribution is a separate platform acceptance step requiring actual ad interaction; simulations must not be represented as that proof.
