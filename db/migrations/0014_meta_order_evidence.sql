CREATE TABLE `meta_order_evidence` (
  `order_id` text PRIMARY KEY NOT NULL,
  `order_name` text NOT NULL,
  `attempt_id` text NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  `checked_at` integer NOT NULL,
  `financial_status` text NOT NULL,
  `canceled` integer NOT NULL,
  `test` integer NOT NULL,
  `currency` text NOT NULL,
  `total_minor` integer NOT NULL,
  `current_minor` integer NOT NULL,
  `refunded_minor` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `meta_order_attempt_idx` ON `meta_order_evidence` (`attempt_id`);
--> statement-breakpoint
CREATE INDEX `meta_order_created_idx` ON `meta_order_evidence` (`created_at`);
--> statement-breakpoint
CREATE TABLE `meta_order_sync` (
  `id` integer PRIMARY KEY NOT NULL,
  `since_at` text NOT NULL,
  `cursor` text,
  `started_at` integer NOT NULL,
  `next_at` integer NOT NULL,
  `lease_until` integer DEFAULT 0 NOT NULL,
  `last_success` integer,
  `last_error` text
);
