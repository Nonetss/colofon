CREATE TABLE "content_repository_share" (
	"repository_id" uuid,
	"organization_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "content_repository_share_pkey" PRIMARY KEY("repository_id","organization_id")
);
--> statement-breakpoint
CREATE INDEX "content_repository_share_organization_id_idx" ON "content_repository_share" ("organization_id");--> statement-breakpoint
ALTER TABLE "content_repository_share" ADD CONSTRAINT "content_repository_share_kyKw8H8Dm9zU_fkey" FOREIGN KEY ("repository_id") REFERENCES "content_repository"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "content_repository_share" ADD CONSTRAINT "content_repository_share_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;