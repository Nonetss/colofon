import { z } from "zod"

const credential = z.object({
  id: z.string(),
  host: z.string(),
  username: z.string(),
  inUse: z.boolean().describe("A repository clones with it"),
  unreadable: z
    .boolean()
    .describe(
      "The stored token can't be decrypted (the encryption key changed); save it again"
    ),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const gitCredentialOutput = {
  credential,
  list: z.object({
    enabled: z
      .boolean()
      .describe(
        "Whether the server can store credentials (SECRETS_ENCRYPTION_KEY)"
      ),
    credentials: z.array(credential),
  }),
  save: credential,
  delete: z.object({ id: z.string(), success: z.boolean() }),
}
