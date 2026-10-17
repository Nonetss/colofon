import { auth } from "@nonete/auth"
import type { z } from "zod"
import type { Context } from "#context"
import { toIso, toIsoOrNull } from "#shared/dates"
import type { apiKeyInput } from "#v1/api-key/input"

type StoredApiKey = Awaited<
  ReturnType<typeof auth.api.listApiKeys>
>["apiKeys"][number]

/** A key as `list` and `update` return it: no secret, dates as ISO strings. */
function toListItem(apiKey: StoredApiKey) {
  return {
    id: apiKey.id,
    name: apiKey.name,
    start: apiKey.start,
    prefix: apiKey.prefix,
    enabled: apiKey.enabled,
    expiresAt: toIsoOrNull(apiKey.expiresAt),
    createdAt: toIso(apiKey.createdAt),
    updatedAt: toIso(apiKey.updatedAt),
  }
}

export const apiKeyHandler = {
  create: async ({
    context,
    input,
  }: {
    context: Context
    input: z.infer<typeof apiKeyInput.create>
  }) => {
    const apiKey = await auth.api.createApiKey({
      headers: context.headers,
      body: {
        configId: "default",
        name: input.name,
        expiresIn: input.expiresIn,
      },
    })

    return {
      ...apiKey,
      lastRefillAt: toIsoOrNull(apiKey.lastRefillAt),
      lastRequest: toIsoOrNull(apiKey.lastRequest),
      expiresAt: toIsoOrNull(apiKey.expiresAt),
      createdAt: toIso(apiKey.createdAt),
      updatedAt: toIso(apiKey.updatedAt),
    }
  },

  list: async ({ context }: { context: Context }) => {
    const { apiKeys } = await auth.api.listApiKeys({
      headers: context.headers,
    })

    return apiKeys.map(toListItem)
  },

  // Better Auth answers NOT_FOUND for a key of another user.
  update: async ({
    context,
    input,
  }: {
    context: Context
    input: z.infer<typeof apiKeyInput.update>
  }) => {
    const apiKey = await auth.api.updateApiKey({
      headers: context.headers,
      body: { keyId: input.id, name: input.name },
    })

    return toListItem(apiKey)
  },

  delete: async ({
    context,
    input,
  }: {
    context: Context
    input: z.infer<typeof apiKeyInput.delete>
  }) => {
    const { success } = await auth.api.deleteApiKey({
      headers: context.headers,
      body: { keyId: input.id },
    })

    return { id: input.id, success }
  },

  search: async ({
    context,
    input,
  }: {
    context: Context
    input: z.infer<typeof apiKeyInput.search>
  }) => {
    const { apiKeys } = await auth.api.listApiKeys({
      headers: context.headers,
    })

    const term = input.query.toLowerCase()
    return apiKeys
      .filter((apiKey) => apiKey.name?.toLowerCase().includes(term))
      .slice(0, input.limit)
      .map((apiKey) => ({
        id: apiKey.id,
        name: apiKey.name,
        prefix: apiKey.prefix,
      }))
  },
}
