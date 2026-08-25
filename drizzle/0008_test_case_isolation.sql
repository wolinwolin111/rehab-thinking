ALTER TABLE `pilot_cases` ADD `is_test_case` integer DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE `pilot_cases` ADD `test_run_id` text;
--> statement-breakpoint
ALTER TABLE `pilot_cases` ADD `scenario_id` text;
--> statement-breakpoint
ALTER TABLE `pilot_cases` ADD `created_by` text;
--> statement-breakpoint
CREATE INDEX `pilot_cases_test_run_idx` ON `pilot_cases` (`test_run_id`);
