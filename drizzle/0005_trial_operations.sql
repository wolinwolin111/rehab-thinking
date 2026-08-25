ALTER TABLE `pilot_cases` ADD `first_use_flow_id` text;--> statement-breakpoint
CREATE TABLE `pilot_trial_events` (
	`id` text PRIMARY KEY NOT NULL,
	`dedupe_key` text NOT NULL,
	`flow_id` text NOT NULL,
	`event_type` text NOT NULL,
	`case_id` text,
	`invite_source` text,
	`app_version` text NOT NULL,
	`knowledge_version` text NOT NULL,
	`decision_version` text NOT NULL,
	`occurred_at` text NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX `pilot_trial_events_dedupe_key_unique` ON `pilot_trial_events` (`dedupe_key`);--> statement-breakpoint
CREATE INDEX `pilot_trial_events_flow_idx` ON `pilot_trial_events` (`flow_id`);--> statement-breakpoint
CREATE INDEX `pilot_trial_events_case_idx` ON `pilot_trial_events` (`case_id`);--> statement-breakpoint
CREATE INDEX `pilot_trial_events_type_idx` ON `pilot_trial_events` (`event_type`);
