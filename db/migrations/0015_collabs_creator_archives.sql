CREATE TABLE `collabs_creator_archives` (
  `creator_id` text PRIMARY KEY NOT NULL REFERENCES `collabs_creators`(`id`),
  `archived_at` integer NOT NULL,
  `archived_by` text NOT NULL,
  `reason` text NOT NULL,
  `note` text DEFAULT '' NOT NULL
);
