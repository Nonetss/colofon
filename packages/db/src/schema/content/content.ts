import {
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"

import { organization, user } from "#schema/auth"
import { gitCredential } from "#schema/git-credential"

/**
 * A git repository of documentation content the backend clones and reads.
 * The slug names it in the editor's public schema URLs, so the application
 * never changes it after creation. The clone lives in a folder named by the
 * id. The URL may carry credentials (https://user:token@host/...): the
 * application never returns or logs it as stored. A repository with an
 * owner is private to that user and the organizations it is shared with;
 * without one it is the platform's, read by every signed-in user.
 */
export const contentRepository = pgTable(
  "content_repository",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    url: text("url").notNull(),
    ownerId: text("owner_id").references(() => user.id, {
      onDelete: "cascade",
    }),
    // The login its clone uses; then `url` carries no credentials. A credential
    // in use can't be deleted.
    credentialId: uuid("credential_id").references(() => gitCredential.id, {
      onDelete: "restrict",
    }),
    // Folder of the git repository that holds the content ("" is the root).
    contentPath: text("content_path").default("").notNull(),
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

/**
 * An organization a user's repository is shared with. Its members read the
 * repository while its owner is a member too; only the owner changes this.
 */
export const contentRepositoryShare = pgTable(
  "content_repository_share",
  {
    repositoryId: uuid("repository_id")
      .notNull()
      .references(() => contentRepository.id, { onDelete: "cascade" }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.repositoryId, table.organizationId] }),
    index("content_repository_share_organization_id_idx").on(
      table.organizationId
    ),
  ]
)

export type ContentRepositoryShare = typeof contentRepositoryShare.$inferSelect
export type NewContentRepositoryShare =
  typeof contentRepositoryShare.$inferInsert
