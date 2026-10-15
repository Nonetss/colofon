import {
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"

/**
 * A git repository of documentation content the backend clones and reads.
 * The slug names it in the editor's public schema URLs, so the application
 * never changes it after creation. The clone lives in a folder named by the
 * id. The URL may carry credentials (https://user:token@host/...): the
 * application never returns or logs it as stored.
 */
export const contentRepository = pgTable(
  "content_repository",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    url: text("url").notNull(),
    // Branch, tag or commit checked out.
    ref: text("ref").default("main").notNull(),
    // Outcome of the last sync, all null until the first one. A failed sync
    // keeps the last commit checked out and stores its error, already
    // stripped of credentials.
    lastSyncedAt: timestamp("last_synced_at"),
    lastCommit: text("last_commit"),
    lastSyncError: text("last_sync_error"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [uniqueIndex("content_repository_slug_idx").on(table.slug)]
)

export type ContentRepository = typeof contentRepository.$inferSelect
export type NewContentRepository = typeof contentRepository.$inferInsert
