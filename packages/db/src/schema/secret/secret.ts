import {
  boolean,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"

import { organization, user } from "#schema/auth"

/**
 * A user's credentials for one service, which the MCP's `request` tool sends
 * there for them. The values of all its fields are encrypted together into
 * `ciphertext` (AES-256-GCM under `SECRETS_ENCRYPTION_KEY`, bound to the row's
 * id and owner) and never leave the backend; `fieldNames` lists them in plain
 * text. `origins` are the normalized `scheme://host[:port]` it may be sent to.
 */
export const secret = pgTable(
  "secret",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    fieldNames: text("field_names").array().notNull(),
    // Base64 of iv ‖ ciphertext ‖ tag.
    ciphertext: text("ciphertext").notNull(),
    origins: text("origins").array().notNull(),
    allowWrite: boolean("allow_write").default(false).notNull(),
    allowInUrl: boolean("allow_in_url").default(false).notNull(),
    allowInBody: boolean("allow_in_body").default(false).notNull(),
    lastUsedAt: timestamp("last_used_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("secret_userId_name_idx").on(table.userId, table.name),
  ]
)

/**
 * An organization a secret is shared with: its members' agents can use it,
 * written `{{<organization slug>/<name>.<field>}}`, while its owner still
 * belongs to that organization. Within one organization the names of the
 * secrets shared with it are unique (checked by the API, not here).
 */
export const secretShare = pgTable(
  "secret_share",
  {
    secretId: uuid("secret_id")
      .notNull()
      .references(() => secret.id, { onDelete: "cascade" }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.secretId, table.organizationId] }),
    index("secret_share_organization_id_idx").on(table.organizationId),
  ]
)

/**
 * One call of the MCP's `request` tool: sent, refused before sending or
 * failed on the way. Never holds headers, bodies, query strings or values.
 * `secretNames` is a snapshot, so a renamed or deleted secret still reads.
 */
export const secretUsage = pgTable(
  "secret_usage",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // The API key the call came with; null for a browser session. No foreign
    // key: the log outlives a revoked key.
    apiKeyId: text("api_key_id"),
    secretIds: uuid("secret_ids").array().notNull(),
    secretNames: text("secret_names").array().notNull(),
    method: text("method").notNull(),
    // Without its query string or fragment, placeholders left unsubstituted.
    url: text("url").notNull(),
    // "sent" | "refused" | "failed".
    outcome: text("outcome").notNull(),
    status: integer("status"),
    // Why it was refused or failed, without values.
    detail: text("detail"),
    durationMs: integer("duration_ms"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("secret_usage_userId_createdAt_idx").on(
      table.userId,
      table.createdAt.desc()
    ),
    index("secret_usage_createdAt_idx").on(table.createdAt),
  ]
)

export type Secret = typeof secret.$inferSelect
export type NewSecret = typeof secret.$inferInsert
export type SecretShare = typeof secretShare.$inferSelect
export type NewSecretShare = typeof secretShare.$inferInsert
export type SecretUsage = typeof secretUsage.$inferSelect
export type NewSecretUsage = typeof secretUsage.$inferInsert
