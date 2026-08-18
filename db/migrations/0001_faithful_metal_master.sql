CREATE TABLE `checkout_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`stripe_session_id` text NOT NULL,
	`provider_event_id` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`currency` text DEFAULT 'usd' NOT NULL,
	`amount_total_cents` integer,
	`customer_email` text,
	`client_reference_id` text,
	`created_at` integer NOT NULL,
	`completed_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `checkout_sessions_stripe_session_id_unique` ON `checkout_sessions` (`stripe_session_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `checkout_sessions_provider_event_id_unique` ON `checkout_sessions` (`provider_event_id`);--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_id` integer NOT NULL,
	`product_code` text NOT NULL,
	`variant_code` text,
	`name_en` text NOT NULL,
	`name_zh` text NOT NULL,
	`unit_price_cents` integer NOT NULL,
	`quantity` integer NOT NULL,
	`line_total_cents` integer NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `order_items_order_idx` ON `order_items` (`order_id`);--> statement-breakpoint
CREATE TABLE `orders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_number` text NOT NULL,
	`stripe_session_id` text NOT NULL,
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
CREATE UNIQUE INDEX `orders_order_number_unique` ON `orders` (`order_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `orders_stripe_session_id_unique` ON `orders` (`stripe_session_id`);