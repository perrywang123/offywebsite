CREATE TABLE `kol_admin_sessions` (
	`digest` text PRIMARY KEY NOT NULL,
	`admin_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`admin_id`) REFERENCES `kol_admins`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `kol_admins` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `kol_admins_email_unique` ON `kol_admins` (`email`);--> statement-breakpoint
CREATE TABLE `kol_audit` (
	`id` text PRIMARY KEY NOT NULL,
	`actor` text NOT NULL,
	`action` text NOT NULL,
	`entity` text NOT NULL,
	`detail` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `kol_code_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`kol_id` text NOT NULL,
	`candidate` text NOT NULL,
	`campaign_id` text NOT NULL,
	`status` text NOT NULL,
	`remote_id` text,
	`error` text,
	`attempts` integer DEFAULT 0 NOT NULL,
	`next_at` integer NOT NULL,
	`lease_until` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`kol_id`) REFERENCES `kol_partners`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `kol_code_jobs_candidate_unique` ON `kol_code_jobs` (`candidate`);--> statement-breakpoint
CREATE TABLE `kol_codes` (
	`id` text PRIMARY KEY NOT NULL,
	`shop` text NOT NULL,
	`normalized` text NOT NULL,
	`kol_id` text NOT NULL,
	`campaign_id` text NOT NULL,
	`source` text NOT NULL,
	`status` text NOT NULL,
	`summary` text NOT NULL,
	`remote_status` text NOT NULL,
	`synced_at` integer NOT NULL,
	FOREIGN KEY (`kol_id`) REFERENCES `kol_partners`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `kol_codes_normalized_unique` ON `kol_codes` (`normalized`);--> statement-breakpoint
CREATE TABLE `kol_inbox` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`topic` text NOT NULL,
	`status` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`next_at` integer NOT NULL,
	`lease_until` integer DEFAULT 0 NOT NULL,
	`error` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `kol_intents` (
	`id` text PRIMARY KEY NOT NULL,
	`referral_id` text NOT NULL,
	`kol_id` text NOT NULL,
	`terms_id` text NOT NULL,
	`rate_bps` integer NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`cart_token` text,
	`order_id` text,
	FOREIGN KEY (`kol_id`) REFERENCES `kol_partners`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`terms_id`) REFERENCES `kol_terms`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `kol_intents_cart_token_unique` ON `kol_intents` (`cart_token`);--> statement-breakpoint
CREATE UNIQUE INDEX `kol_intents_order_id_unique` ON `kol_intents` (`order_id`);--> statement-breakpoint
CREATE TABLE `kol_ledger` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`kol_id` text NOT NULL,
	`currency` text NOT NULL,
	`amount` integer NOT NULL,
	`available_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `kol_shop_orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`kol_id`) REFERENCES `kol_partners`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `kol_login_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`attempts` integer NOT NULL,
	`resets_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `kol_partners` (
	`id` text PRIMARY KEY NOT NULL,
	`alias` text NOT NULL,
	`name` text NOT NULL,
	`status` text NOT NULL,
	`version` integer NOT NULL,
	`requests` integer DEFAULT 0 NOT NULL,
	`landings` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `kol_partners_alias_unique` ON `kol_partners` (`alias`);--> statement-breakpoint
CREATE TABLE `kol_referrals` (
	`id` text PRIMARY KEY NOT NULL,
	`kol_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`last_active_at` integer NOT NULL,
	`landed_at` integer,
	FOREIGN KEY (`kol_id`) REFERENCES `kol_partners`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `kol_referrals_time_idx` ON `kol_referrals` (`created_at`);--> statement-breakpoint
CREATE TABLE `kol_runtime` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `kol_settlement_items` (
	`ledger_id` text PRIMARY KEY NOT NULL,
	`settlement_id` text NOT NULL,
	FOREIGN KEY (`ledger_id`) REFERENCES `kol_ledger`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`settlement_id`) REFERENCES `kol_settlements`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `kol_settlements` (
	`id` text PRIMARY KEY NOT NULL,
	`kol_id` text NOT NULL,
	`currency` text NOT NULL,
	`month` text NOT NULL,
	`status` text NOT NULL,
	`total` integer NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`payment_ref` text,
	`payment_note` text,
	`created_at` integer NOT NULL,
	`paid_at` integer,
	FOREIGN KEY (`kol_id`) REFERENCES `kol_partners`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `kol_shop_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`kol_id` text,
	`intent_id` text,
	`currency` text NOT NULL,
	`net` integer,
	`commission` integer,
	`rate_bps` integer,
	`status` text NOT NULL,
	`reason` text,
	`paid_at` integer,
	`hold_until` integer,
	`evidence` text NOT NULL,
	`checked_at` integer NOT NULL,
	FOREIGN KEY (`kol_id`) REFERENCES `kol_partners`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `kol_terms` (
	`id` text PRIMARY KEY NOT NULL,
	`kol_id` text NOT NULL,
	`version` integer NOT NULL,
	`rate_bps` integer NOT NULL,
	`starts_at` integer NOT NULL,
	`ends_at` integer NOT NULL,
	`data` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`kol_id`) REFERENCES `kol_partners`(`id`) ON UPDATE no action ON DELETE no action
);
