import { z } from "zod"

const organization = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
})

const secretFields = {
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  fields: z.array(z.string()).describe("Field names; values are never sent"),
  origins: z.array(z.string()),
  allowWrite: z.boolean(),
  allowInUrl: z.boolean(),
  allowInBody: z.boolean(),
  unreadable: z
    .boolean()
    .describe(
      "The stored values can't be decrypted (the encryption key changed); save them again"
    ),
}

const secret = z.object({
  ...secretFields,
  organizations: z
    .array(organization)
    .describe("The organizations it is shared with, by name"),
  lastUsedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const sharedSecret = z.object({
  ...secretFields,
  organization: organization.describe("The organization it comes through"),
  ownerName: z.string(),
  prefix: z
    .string()
    .describe(
      "What its placeholders start with: {{<prefix><name>.<field>}}, the organization's slug and a slash"
    ),
})

const usageEntry = z.object({
  id: z.string(),
  user: z
    .object({ id: z.string(), name: z.string() })
    .nullable()
    .describe("Who made the call; null when that user no longer exists"),
  apiKeyId: z.string().nullable(),
  secretNames: z.array(z.string()),
  method: z.string(),
  url: z.string().describe("Without its query string; placeholders as written"),
  outcome: z.enum(["sent", "refused", "failed"]),
  status: z.number().int().nullable(),
  detail: z.string().nullable(),
  durationMs: z.number().int().nullable(),
  createdAt: z.string(),
})

export const secretOutput = {
  secret,
  list: z.object({
    enabled: z
      .boolean()
      .describe(
        "Whether the server has secrets configured (SECRETS_ENCRYPTION_KEY)"
      ),
    secrets: z.array(secret),
    shared: z
      .array(sharedSecret)
      .describe(
        "Secrets other users share with the caller, once per organization, by organization slug and name"
      ),
  }),
  create: secret,
  update: secret,
  delete: z.object({ id: z.string(), success: z.boolean() }),
  share: secret,
  usage: z.object({
    entries: z.array(usageEntry),
    nextCursor: z.string().nullable(),
  }),
  purgeUsage: z.object({ deleted: z.number().int() }),
}
