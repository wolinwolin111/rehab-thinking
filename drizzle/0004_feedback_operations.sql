ALTER TABLE `case_feedback` ADD `status` text DEFAULT 'open' NOT NULL;--> statement-breakpoint
ALTER TABLE `case_feedback` ADD `app_version` text DEFAULT 'legacy' NOT NULL;--> statement-breakpoint
ALTER TABLE `case_feedback` ADD `knowledge_version` text DEFAULT 'legacy' NOT NULL;--> statement-breakpoint
ALTER TABLE `case_feedback` ADD `decision_version` text DEFAULT 'legacy' NOT NULL;--> statement-breakpoint
ALTER TABLE `case_feedback` ADD `updated_at` text;--> statement-breakpoint
CREATE INDEX `case_feedback_status_idx` ON `case_feedback` (`status`);
