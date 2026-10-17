import {
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"

import { user } from "#schema/auth"

/**
 * A user's login for one git server (`host` with its port, lowercase), which
 * their repositories on that server clone with. The token is encrypted into
 * `ciphertext` (AES-256-GCM under `SECRETS_ENCRYPTION_KEY`, bound to the
 * row's id and owner) and never leaves the backend; the username is plain.
 */
export const gitCredential = pgTable(
  "git_credential",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    host: text("host").notNull(),
    username: text("username").notNull(),
    // Base64 of iv ‖ ciphertext ‖ tag.
    ciphertext: text("ciphertext").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("git_credential_userId_host_username_idx").on(
      table.userId,
      table.host,
      table.username
    ),
  ]
)

export type GitCredential = typeof gitCredential.$inferSelect
export type NewGitCredential = typeof gitCredential.$inferInsert
