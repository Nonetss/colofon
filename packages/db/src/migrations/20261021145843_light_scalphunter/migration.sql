CREATE TABLE "secret_share" (
	"secret_id" uuid,
	"organization_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "secret_share_pkey" PRIMARY KEY("secret_id","organization_id")
);
--> statement-breakpoint
CREATE INDEX "secret_share_organization_id_idx" ON "secret_share" ("organization_id");--> statement-breakpoint
ALTER TABLE "secret_share" ADD CONSTRAINT "secret_share_secret_id_secret_id_fkey" FOREIGN KEY ("secret_id") REFERENCES "secret"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "secret_share" ADD CONSTRAINT "secret_share_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;