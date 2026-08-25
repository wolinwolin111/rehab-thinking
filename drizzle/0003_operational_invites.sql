ALTER TABLE `pilot_cases` ADD `invite_token_hash` text;--> statement-breakpoint
ALTER TABLE `pilot_cases` ADD `invite_source` text;--> statement-breakpoint
CREATE INDEX `pilot_cases_invite_hash_idx` ON `pilot_cases` (`invite_token_hash`);
