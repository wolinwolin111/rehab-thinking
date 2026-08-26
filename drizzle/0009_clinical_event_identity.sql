ALTER TABLE `case_events` ADD `event_schema_version` integer;
--> statement-breakpoint
ALTER TABLE `case_events` ADD `problem_thread_id` text;
--> statement-breakpoint
ALTER TABLE `case_events` ADD `session_id` text;
--> statement-breakpoint
CREATE INDEX `case_events_session_idx` ON `case_events` (`case_id`,`session_id`);
