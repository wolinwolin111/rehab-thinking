CREATE TABLE `admin_notes` (
	`id` text PRIMARY KEY NOT NULL,
	`case_id` text NOT NULL,
	`note` text NOT NULL,
	`author` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`case_id`) REFERENCES `pilot_cases`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `admin_notes_case_idx` ON `admin_notes` (`case_id`);--> statement-breakpoint
CREATE TABLE `app_releases` (
	`version` text PRIMARY KEY NOT NULL,
	`released_at` text NOT NULL,
	`notes` text
);
--> statement-breakpoint
CREATE TABLE `case_events` (
	`id` text PRIMARY KEY NOT NULL,
	`case_id` text NOT NULL,
	`sequence` integer NOT NULL,
	`type` text NOT NULL,
	`payload` text NOT NULL,
	`source` text NOT NULL,
	`occurred_at` text NOT NULL,
	`app_version` text NOT NULL,
	`knowledge_version` text NOT NULL,
	`decision_version` text NOT NULL,
	FOREIGN KEY (`case_id`) REFERENCES `pilot_cases`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `case_events_case_sequence_unique` ON `case_events` (`case_id`,`sequence`);--> statement-breakpoint
CREATE INDEX `case_events_case_idx` ON `case_events` (`case_id`);--> statement-breakpoint
CREATE INDEX `case_events_type_idx` ON `case_events` (`type`);--> statement-breakpoint
CREATE TABLE `case_feedback` (
	`id` text PRIMARY KEY NOT NULL,
	`case_id` text NOT NULL,
	`event_id` text,
	`stage` text NOT NULL,
	`kind` text NOT NULL,
	`message` text,
	`payload` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`case_id`) REFERENCES `pilot_cases`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`event_id`) REFERENCES `case_events`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `case_feedback_case_idx` ON `case_feedback` (`case_id`);--> statement-breakpoint
CREATE INDEX `case_feedback_stage_idx` ON `case_feedback` (`stage`);--> statement-breakpoint
CREATE TABLE `case_snapshots` (
	`case_id` text PRIMARY KEY NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`payload` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`case_id`) REFERENCES `pilot_cases`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `decision_releases` (
	`version` text PRIMARY KEY NOT NULL,
	`released_at` text NOT NULL,
	`notes` text
);
--> statement-breakpoint
CREATE TABLE `knowledge_gap_candidates` (
	`id` text PRIMARY KEY NOT NULL,
	`case_id` text NOT NULL,
	`source_event_id` text,
	`category` text NOT NULL,
	`label` text NOT NULL,
	`detail` text,
	`status` text DEFAULT 'observed' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`case_id`) REFERENCES `pilot_cases`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_event_id`) REFERENCES `case_events`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `knowledge_gap_candidates_case_idx` ON `knowledge_gap_candidates` (`case_id`);--> statement-breakpoint
CREATE INDEX `knowledge_gap_candidates_status_idx` ON `knowledge_gap_candidates` (`status`);--> statement-breakpoint
CREATE TABLE `knowledge_releases` (
	`version` text PRIMARY KEY NOT NULL,
	`released_at` text NOT NULL,
	`notes` text
);
--> statement-breakpoint
CREATE TABLE `pilot_cases` (
	`id` text PRIMARY KEY NOT NULL,
	`public_code` text NOT NULL,
	`access_token_hash` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`current_stage` text,
	`is_trial` integer DEFAULT true NOT NULL,
	`is_bilateral` integer DEFAULT false NOT NULL,
	`has_safety_stop` integer DEFAULT false NOT NULL,
	`session_count` integer DEFAULT 0 NOT NULL,
	`app_version` text NOT NULL,
	`knowledge_version` text NOT NULL,
	`decision_version` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pilot_cases_public_code_unique` ON `pilot_cases` (`public_code`);--> statement-breakpoint
CREATE INDEX `pilot_cases_status_idx` ON `pilot_cases` (`status`);--> statement-breakpoint
CREATE INDEX `pilot_cases_created_at_idx` ON `pilot_cases` (`created_at`);