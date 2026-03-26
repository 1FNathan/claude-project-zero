CREATE TABLE `flow_edges` (
	`id` text PRIMARY KEY NOT NULL,
	`flow_id` text NOT NULL,
	`source_node_id` text NOT NULL,
	`target_node_id` text NOT NULL,
	`label` text,
	`source_handle` text,
	`target_handle` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`flow_id`) REFERENCES `flows`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `flow_nodes` (
	`id` text PRIMARY KEY NOT NULL,
	`flow_id` text NOT NULL,
	`position_x` real DEFAULT 0 NOT NULL,
	`position_y` real DEFAULT 0 NOT NULL,
	`step_id` text DEFAULT '' NOT NULL,
	`node_type` text NOT NULL,
	`pithy_label` text DEFAULT '' NOT NULL,
	`color` text DEFAULT '#6366f1' NOT NULL,
	`actor` text DEFAULT '' NOT NULL,
	`action_description` text DEFAULT '' NOT NULL,
	`business_rules` text DEFAULT '' NOT NULL,
	`timing_constraints` text DEFAULT '' NOT NULL,
	`documents_used` text DEFAULT '[]' NOT NULL,
	`data_fields` text DEFAULT '[]' NOT NULL,
	`systems_used` text DEFAULT '[]' NOT NULL,
	`process_status` text DEFAULT '' NOT NULL,
	`process_substatus` text DEFAULT '' NOT NULL,
	`next_actor` text DEFAULT '' NOT NULL,
	`review_decision` text,
	`review_comment` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`flow_id`) REFERENCES `flows`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `flows` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_by` text NOT NULL,
	`review_comment` text,
	`reviewed_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);