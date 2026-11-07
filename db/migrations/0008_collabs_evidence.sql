CREATE TABLE `collabs_checks` (
	`id` text PRIMARY KEY NOT NULL,
	`report_id` text NOT NULL,
	`actor` text NOT NULL,
	`checked_at` integer NOT NULL,
	`data_json` text NOT NULL,
	FOREIGN KEY (`report_id`) REFERENCES `collabs_reports`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `collabs_checks_report_idx` ON `collabs_checks` (`report_id`,`checked_at`);--> statement-breakpoint
CREATE TABLE `collabs_creators` (
	`id` text PRIMARY KEY NOT NULL,
	`alias` text NOT NULL,
	`name` text NOT NULL,
	`creator_key` text NOT NULL,
	`official_link` text NOT NULL,
	`enabled` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `collabs_creators_alias_unique` ON `collabs_creators` (`alias`);--> statement-breakpoint
CREATE UNIQUE INDEX `collabs_creators_creator_key_unique` ON `collabs_creators` (`creator_key`);--> statement-breakpoint
CREATE TABLE `collabs_report_rows` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`report_id` text NOT NULL,
	`row_number` integer NOT NULL,
	`data_json` text NOT NULL,
	FOREIGN KEY (`report_id`) REFERENCES `collabs_reports`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `collabs_rows_report_idx` ON `collabs_report_rows` (`report_id`,`row_number`);--> statement-breakpoint
CREATE TABLE `collabs_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`digest` text NOT NULL,
	`file_sha` text NOT NULL,
	`filename` text NOT NULL,
	`kind` text NOT NULL,
	`granularity` text NOT NULL,
	`sales_basis` text NOT NULL,
	`period_from` text NOT NULL,
	`period_to` text NOT NULL,
	`mapping_json` text NOT NULL,
	`totals_json` text NOT NULL,
	`warnings_json` text NOT NULL,
	`original_encrypted` text NOT NULL,
	`row_count` integer NOT NULL,
	`status` text NOT NULL,
	`supersedes` text,
	`actor` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `collabs_reports_digest_unique` ON `collabs_reports` (`digest`);--> statement-breakpoint
CREATE TABLE `collabs_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`check_id` text NOT NULL,
	`finding_key` text NOT NULL,
	`actor` text NOT NULL,
	`reason` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`check_id`) REFERENCES `collabs_checks`(`id`) ON UPDATE no action ON DELETE no action
);
