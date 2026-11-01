CREATE TABLE `checkout_attempt_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`attempt_id` text NOT NULL,
	`at` integer NOT NULL,
	`type` text NOT NULL,
	`data_json` text NOT NULL,
	`sensitive_json` text,
	FOREIGN KEY (`attempt_id`) REFERENCES `checkout_attempts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `checkout_attempt_events_attempt_idx` ON `checkout_attempt_events` (`attempt_id`,`id`);--> statement-breakpoint
CREATE TABLE `checkout_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`receipt_digest` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`claimed_at` integer,
	`status` text NOT NULL,
	`country` text NOT NULL,
	`country_json` text NOT NULL,
	`items_json` text NOT NULL,
	`locale` text NOT NULL,
	`page_path` text NOT NULL,
	`error` text,
	`duration_ms` integer,
	`redirect_host` text,
	`sensitive_json` text,
	`sensitive_expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `checkout_attempts_receipt_digest_unique` ON `checkout_attempts` (`receipt_digest`);--> statement-breakpoint
CREATE INDEX `checkout_attempts_time_idx` ON `checkout_attempts` (`created_at`);--> statement-breakpoint
CREATE INDEX `checkout_attempts_country_status_idx` ON `checkout_attempts` (`country`,`status`,`created_at`);