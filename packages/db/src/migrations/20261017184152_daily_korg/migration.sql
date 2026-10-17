CREATE TABLE "git_credential" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL,
	"host" text NOT NULL,
	"username" text NOT NULL,
	"ciphertext" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "content_repository" ADD COLUMN "credential_id" uuid;--> statement-breakpoint
CREATE UNIQUE INDEX "git_credential_userId_host_username_idx" ON "git_credential" ("user_id","host","username");--> statement-breakpoint
ALTER TABLE "content_repository" ADD CONSTRAINT "content_repository_credential_id_git_credential_id_fkey" FOREIGN KEY ("credential_id") REFERENCES "git_credential"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "git_credential" ADD CONSTRAINT "git_credential_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;