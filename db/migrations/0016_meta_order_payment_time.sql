ALTER TABLE `meta_order_evidence` ADD `paid_at` integer;
--> statement-breakpoint
ALTER TABLE `meta_order_sync` ADD `payment_scan_started` integer DEFAULT 0 NOT NULL;
