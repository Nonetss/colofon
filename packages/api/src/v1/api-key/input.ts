import { z } from "zod"

import { searchLimit, searchQuery } from "#shared/search"

export const apiKeyInput = {
  create: z.object({
    name: z.string().describe("The name of the API key").default("API Key"),
    expiresIn: z
      .number()
      .nullable()
      .describe(
        "The number of seconds until the API key expires; null for a key that never expires"
      )
      .default(3600 * 24 * 30),
  }),
  update: z.object({
    id: z.string().describe("The id of the API key to rename"),
    name: z
      .string()
      .trim()
      .min(1)
      // Better Auth's default `maximumNameLength`.
      .max(32)
      .describe("The new name of the API key"),
  }),
  delete: z.object({
    id: z.string().describe("The id of the API key to delete"),
  }),
  search: z.object({
    query: searchQuery().describe("Match against the API key name"),
    limit: searchLimit(),
  }),
}
