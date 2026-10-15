CREATE TABLE "content_repository" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"ref" text DEFAULT 'main' NOT NULL,
	"last_synced_at" timestamp,
	"last_commit" text,
	"last_sync_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "content_repository_slug_idx" ON "content_repository" ("slug");