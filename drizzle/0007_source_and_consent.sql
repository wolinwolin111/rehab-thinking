ALTER TABLE `pilot_cases` ADD `source_channel` text;
--> statement-breakpoint
ALTER TABLE `pilot_cases` ADD `source_detail` text;
--> statement-breakpoint
ALTER TABLE `pilot_cases` ADD `consent_version` text;
--> statement-breakpoint
ALTER TABLE `pilot_cases` ADD `consent_confirmed_at` text;
--> statement-breakpoint
CREATE INDEX `pilot_cases_source_channel_idx` ON `pilot_cases` (`source_channel`);
