CREATE TABLE `homepage_content` (
	`id` integer PRIMARY KEY NOT NULL,
	`revision` integer NOT NULL,
	`content` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `homepage_images` (
	`id` text PRIMARY KEY NOT NULL,
	`bytes` blob NOT NULL,
	`published` integer DEFAULT false NOT NULL
);
