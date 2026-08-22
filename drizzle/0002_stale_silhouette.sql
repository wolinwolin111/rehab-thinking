ALTER TABLE `pilot_cases` ADD `client_creation_id` text DEFAULT '' NOT NULL;--> statement-breakpoint
UPDATE `pilot_cases` SET `client_creation_id` = 'legacy-' || `id` WHERE `client_creation_id` = '';--> statement-breakpoint
CREATE UNIQUE INDEX `pilot_cases_client_creation_id_unique` ON `pilot_cases` (`client_creation_id`);
