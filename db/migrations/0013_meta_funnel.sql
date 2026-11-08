CREATE TABLE `meta_events` (
 `id` text PRIMARY KEY NOT NULL,
 `visitor_hash` text NOT NULL,
 `name` text NOT NULL,
 `created_at` integer NOT NULL,
 `page_path` text NOT NULL,
 `source_json` text NOT NULL,
 `data_json` text NOT NULL,
 `attempt_id` text,
 `has_fbc` integer NOT NULL,
 `has_fbp` integer NOT NULL,
 `pixel_attempted` integer NOT NULL,
 `status` text NOT NULL,
 `payload` text,
 `attempts` integer DEFAULT 0 NOT NULL,
 `due_at` integer NOT NULL,
 `lease_until` integer DEFAULT 0 NOT NULL,
 `lease_token` text,
 `last_error` text,
 `sent_at` integer
);
--> statement-breakpoint
CREATE INDEX `meta_due_idx` ON `meta_events` (`status`,`due_at`);
--> statement-breakpoint
CREATE INDEX `meta_visitor_idx` ON `meta_events` (`visitor_hash`);
--> statement-breakpoint
CREATE INDEX `meta_created_idx` ON `meta_events` (`created_at`);
