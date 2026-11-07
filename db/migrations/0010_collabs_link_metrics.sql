CREATE TABLE `collabs_link_daily` (
	`creator_id` text NOT NULL,
	`day` text NOT NULL,
	`opens` integer NOT NULL,
	`first_at` integer NOT NULL,
	`last_at` integer NOT NULL,
	PRIMARY KEY(`creator_id`, `day`),
	FOREIGN KEY (`creator_id`) REFERENCES `collabs_creators`(`id`) ON UPDATE no action ON DELETE no action
);
