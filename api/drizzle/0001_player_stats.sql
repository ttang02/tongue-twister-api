CREATE TABLE IF NOT EXISTS `player_stats` (
	`player_name` text NOT NULL,
	`language`    text NOT NULL CHECK(`language` IN ('fr', 'en', 'ko', 'vi')),
	`total_score` integer NOT NULL DEFAULT 0,
	`count_easy`  integer NOT NULL DEFAULT 0,
	`count_medium` integer NOT NULL DEFAULT 0,
	`count_hard`  integer NOT NULL DEFAULT 0,
	`updated_at`  text DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY (`player_name`, `language`)
);
