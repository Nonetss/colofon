CREATE TABLE "secret" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"field_names" text[] NOT NULL,
	"ciphertext" text NOT NULL,
	"origins" text[] NOT NULL,
	"allow_write" boolean DEFAULT false NOT NULL,
	"allow_in_url" boolean DEFAULT false NOT NULL,
	"allow_in_body" boolean DEFAULT false NOT NULL,
	"last_used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "secret_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL,
	"api_key_id" text,
	"secret_ids" uuid[] NOT NULL,
	"secret_names" text[] NOT NULL,
	"method" text NOT NULL,
	"url" text NOT NULL,
	"outcome" text NOT NULL,
	"status" integer,
	"detail" text,
	"duration_ms" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "secret_userId_name_idx" ON "secret" ("user_id","name");--> statement-breakpoint
CREATE INDEX "secret_usage_userId_createdAt_idx" ON "secret_usage" ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "secret_usage_createdAt_idx" ON "secret_usage" ("created_at");--> statement-breakpoint
ALTER TABLE "secret" ADD CONSTRAINT "secret_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "secret_usage" ADD CONSTRAINT "secret_usage_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;