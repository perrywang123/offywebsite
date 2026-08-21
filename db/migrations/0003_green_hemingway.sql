PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_checkout_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`provider` text DEFAULT 'stripe' NOT NULL,
	`stripe_session_id` text,
	`paypal_order_id` text,
	`provider_event_id` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`currency` text DEFAULT 'usd' NOT NULL,
	`amount_total_cents` integer,
	`customer_email` text,
	`client_reference_id` text,
	`line_items_json` text,
	`created_at` integer NOT NULL,
	`completed_at` integer
);
--> statement-breakpoint
INSERT INTO `__new_checkout_sessions`("id", "stripe_session_id", "provider_event_id", "status", "currency", "amount_total_cents", "customer_email", "client_reference_id", "line_items_json", "created_at", "completed_at") SELECT "id", "stripe_session_id", "provider_event_id", "status", "currency", "amount_total_cents", "customer_email", "client_reference_id", "line_items_json", "created_at", "completed_at" FROM `checkout_sessions`;--> statement-breakpoint
DROP TABLE `checkout_sessions`;--> statement-breakpoint
ALTER TABLE `__new_checkout_sessions` RENAME TO `checkout_sessions`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `checkout_sessions_stripe_session_id_unique` ON `checkout_sessions` (`stripe_session_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `checkout_sessions_paypal_order_id_unique` ON `checkout_sessions` (`paypal_order_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `checkout_sessions_provider_event_id_unique` ON `checkout_sessions` (`provider_event_id`);--> statement-breakpoint
CREATE TABLE `__new_orders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_number` text NOT NULL,
	`provider` text DEFAULT 'stripe' NOT NULL,
	`stripe_session_id` text,
	`paypal_order_id` text,
	`email` text NOT NULL,
	`customer_name` text,
	`currency` text DEFAULT 'usd' NOT NULL,
	`subtotal_cents` integer NOT NULL,
	`total_cents` integer NOT NULL,
	`status` text DEFAULT 'paid' NOT NULL,
	`paid_at` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_orders`("id", "order_number", "email", "customer_name", "currency", "subtotal_cents", "total_cents", "status", "paid_at", "created_at") SELECT "id", "order_number", "email", "customer_name", "currency", "subtotal_cents", "total_cents", "status", "paid_at", "created_at" FROM `orders`;--> statement-breakpoint
DROP TABLE `orders`;--> statement-breakpoint
ALTER TABLE `__new_orders` RENAME TO `orders`;--> statement-breakpoint
CREATE UNIQUE INDEX `orders_order_number_unique` ON `orders` (`order_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `orders_stripe_session_id_unique` ON `orders` (`stripe_session_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `orders_paypal_order_id_unique` ON `orders` (`paypal_order_id`);