import { z } from "zod"

const secret = z.object({
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
  lastUsedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const usageEntry = z.object({
  id: z.string(),
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
  }),
  create: secret,
  update: secret,
  delete: z.object({ id: z.string(), success: z.boolean() }),
  usage: z.object({
    entries: z.array(usageEntry),
    nextCursor: z.string().nullable(),
  }),
  purgeUsage: z.object({ deleted: z.number().int() }),
}
