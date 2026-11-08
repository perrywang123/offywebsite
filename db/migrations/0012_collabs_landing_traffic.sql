CREATE TABLE `collabs_landing_daily` (
 `dt_id` text NOT NULL,
 `day` text NOT NULL,
 `pv` integer NOT NULL,
 `first_at` integer NOT NULL,
 `last_at` integer NOT NULL,
 PRIMARY KEY(`dt_id`, `day`)
);
--> statement-breakpoint
CREATE TABLE `collabs_landing_visitors` (
 `dt_id` text NOT NULL,
 `day` text NOT NULL,
 `visitor_hash` text NOT NULL,
 `last_at` integer NOT NULL,
 PRIMARY KEY(`dt_id`, `day`, `visitor_hash`)
);
--> statement-breakpoint
CREATE INDEX `collabs_landing_visitors_day` ON `collabs_landing_visitors` (`day`);
--> statement-breakpoint
CREATE INDEX `collabs_landing_visitors_hash` ON `collabs_landing_visitors` (`visitor_hash`);
--> statement-breakpoint
CREATE TABLE `collabs_landing_receipts` (
 `id` text PRIMARY KEY NOT NULL,
 `received_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `collabs_landing_receipts_time` ON `collabs_landing_receipts` (`received_at`);
