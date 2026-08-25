CREATE TABLE `pilot_admin_audit` (
	`id` text PRIMARY KEY NOT NULL,
	`case_id` text NOT NULL,
	`action` text NOT NULL,
	`target_id` text,
	`metadata` text,
	`app_version` text NOT NULL,
	`knowledge_version` text NOT NULL,
	`decision_version` text NOT NULL,
	`occurred_at` text NOT NULL
);--> statement-breakpoint
CREATE INDEX `pilot_admin_audit_case_idx` ON `pilot_admin_audit` (`case_id`);--> statement-breakpoint
CREATE INDEX `pilot_admin_audit_action_idx` ON `pilot_admin_audit` (`action`);
