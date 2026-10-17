CREATE TABLE `equipment` (
	`tenantID` text NOT NULL,
	`id` text NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`qrInfo` text DEFAULT '' NOT NULL,
	`image` text DEFAULT '' NOT NULL,
	`location` text DEFAULT 'انبار تجهیزات' NOT NULL,
	`approval` text DEFAULT 'pending' NOT NULL,
	`expiry` text,
	`created` text NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`tenantID`, `id`),
	FOREIGN KEY (`tenantID`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `equipment_tenant_code` ON `equipment` (`tenantID`,`code`);--> statement-breakpoint
CREATE TABLE `events` (
	`tenantID` text NOT NULL,
	`id` text NOT NULL,
	`equipmentID` text NOT NULL,
	`kind` text NOT NULL,
	`destination` text DEFAULT '' NOT NULL,
	`reason` text DEFAULT '' NOT NULL,
	`condition` text DEFAULT '' NOT NULL,
	`result` text DEFAULT '' NOT NULL,
	`cycleID` text,
	`actor` text NOT NULL,
	`at` text NOT NULL,
	PRIMARY KEY(`tenantID`, `id`),
	FOREIGN KEY (`tenantID`,`equipmentID`) REFERENCES `equipment`(`tenantID`,`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `events_tenant_equipment` ON `events` (`tenantID`,`equipmentID`);--> statement-breakpoint
CREATE TABLE `members` (
	`tenantID` text NOT NULL,
	`email` text NOT NULL,
	`role` text NOT NULL,
	PRIMARY KEY(`tenantID`, `email`),
	FOREIGN KEY (`tenantID`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `tenants` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`owner` text NOT NULL,
	`created` text NOT NULL
);
CREATE TABLE auth_users(id TEXT PRIMARY KEY,email TEXT NOT NULL UNIQUE,name TEXT NOT NULL,password TEXT NOT NULL,platform_admin INTEGER NOT NULL DEFAULT 0,active INTEGER NOT NULL DEFAULT 1,created TEXT NOT NULL);
CREATE TABLE auth_sessions(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,expires INTEGER NOT NULL);
CREATE INDEX auth_sessions_expiry ON auth_sessions(expires);
CREATE TABLE auth_attempts(key TEXT PRIMARY KEY,count INTEGER NOT NULL,until INTEGER NOT NULL);
CREATE TABLE auth_audit(id INTEGER PRIMARY KEY AUTOINCREMENT,actor TEXT NOT NULL,action TEXT NOT NULL,target TEXT NOT NULL,at TEXT NOT NULL);

CREATE TABLE schema_migrations(name TEXT PRIMARY KEY, hash TEXT NOT NULL, applied TEXT NOT NULL);