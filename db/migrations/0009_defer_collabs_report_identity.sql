CREATE TABLE `__new_collabs_creators` (
	`id` text PRIMARY KEY NOT NULL,
	`alias` text NOT NULL,
	`name` text NOT NULL,
	`creator_key` text,
	`official_link` text NOT NULL,
	`enabled` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_collabs_creators`("id", "alias", "name", "creator_key", "official_link", "enabled", "created_at", "updated_at") SELECT "id", "alias", "name", "creator_key", "official_link", "enabled", "created_at", "updated_at" FROM `collabs_creators`;--> statement-breakpoint
DROP TABLE `collabs_creators`;--> statement-breakpoint
ALTER TABLE `__new_collabs_creators` RENAME TO `collabs_creators`;--> statement-breakpoint
CREATE UNIQUE INDEX `collabs_creators_alias_unique` ON `collabs_creators` (`alias`);--> statement-breakpoint
CREATE UNIQUE INDEX `collabs_creators_creator_key_unique` ON `collabs_creators` (`creator_key`);
