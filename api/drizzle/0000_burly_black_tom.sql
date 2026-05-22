CREATE TABLE `phrases` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`language` text NOT NULL,
	`country` text NOT NULL,
	`text` text NOT NULL,
	`difficulty` text DEFAULT 'medium' NOT NULL,
	`timer_s` integer DEFAULT 20 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `scores` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`phrase_id` integer NOT NULL,
	`player_name` text NOT NULL,
	`elapsed_ms` integer NOT NULL,
	`accuracy` real NOT NULL,
	`score` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`phrase_id`) REFERENCES `phrases`(`id`) ON UPDATE no action ON DELETE no action
);
