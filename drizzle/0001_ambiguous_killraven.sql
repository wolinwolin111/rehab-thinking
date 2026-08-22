ALTER TABLE `case_feedback` ADD `session_number` integer;--> statement-breakpoint
ALTER TABLE `case_feedback` ADD `source` text DEFAULT 'in_app' NOT NULL;--> statement-breakpoint
ALTER TABLE `case_feedback` ADD `source_session_number` integer;--> statement-breakpoint
ALTER TABLE `case_feedback` ADD `source_stage` text;--> statement-breakpoint
ALTER TABLE `case_feedback` ADD `source_event_id` text REFERENCES case_events(id);--> statement-breakpoint
CREATE INDEX `case_feedback_session_idx` ON `case_feedback` (`case_id`,`session_number`);--> statement-breakpoint
CREATE INDEX `case_feedback_source_idx` ON `case_feedback` (`source`);