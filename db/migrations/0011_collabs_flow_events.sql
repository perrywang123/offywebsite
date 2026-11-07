CREATE TABLE `collabs_attributions` (
	`id` text PRIMARY KEY NOT NULL,
	`native_id` text NOT NULL,
	`order_id` text NOT NULL,
	`order_name` text NOT NULL,
	`order_created_at` text NOT NULL,
	`flow_sent_at` integer NOT NULL,
	`received_at` integer NOT NULL,
	`order_json` text,
	`checked_at` integer,
	`next_at` integer NOT NULL,
	`lease_until` integer DEFAULT 0 NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`error` text,
	FOREIGN KEY (`native_id`) REFERENCES `collabs_flow_creators`(`native_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `collabs_attributions_due_idx` ON `collabs_attributions` (`next_at`,`lease_until`);--> statement-breakpoint
CREATE INDEX `collabs_attributions_received_idx` ON `collabs_attributions` (`received_at`);--> statement-breakpoint
CREATE TABLE `collabs_flow_creators` (
	`native_id` text PRIMARY KEY NOT NULL,
	`creator_id` text,
	`snapshot_json` text NOT NULL,
	`flow_sent_at` integer NOT NULL,
	`first_received_at` integer NOT NULL,
	`last_received_at` integer NOT NULL,
	FOREIGN KEY (`creator_id`) REFERENCES `collabs_creators`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `collabs_flow_creators_creator_id_unique` ON `collabs_flow_creators` (`creator_id`);