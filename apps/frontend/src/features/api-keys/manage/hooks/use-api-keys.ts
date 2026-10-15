import { useQuery } from "@tanstack/react-query"
import type {
  ApiKey,
  ApiKeyListItem,
} from "@/features/api-keys/manage/model/types"
import { useResourceMutation } from "@/hooks/use-resource-mutation"
import { orpc } from "@/lib/orpc"

export const useApiKeysList = () => {
  return useQuery(orpc.v1.apiKey.list.queryOptions())
}

const listKey = orpc.v1.apiKey.list.queryKey()

type ApiKeyCreateInput = {
  name?: string
  /** Seconds until it expires; `null` never expires. */
  expiresIn: number | null
}

type ApiKeyDeleteOutput = { id: string; success: boolean }

function expiryOf(now: Date, expiresIn: number | null): string | null {
  if (expiresIn === null) return null
  return new Date(now.getTime() + expiresIn * 1000).toISOString()
}

function applyCreateOptimistic(
  current: ApiKeyListItem[] | undefined,
  input: ApiKeyCreateInput
) {
  if (!current) return current
  const now = new Date()
  const optimistic: ApiKeyListItem = {
    id: `__optimistic_${Date.now()}`,
    name: input.name ?? null,
    start: null,
    prefix: null,
    enabled: true,
    expiresAt: expiryOf(now, input.expiresIn),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  }
  return [...current, optimistic]
}

function applyDeleteOptimistic(
  current: ApiKeyListItem[] | undefined,
  input: { id: string }
) {
  if (!current) return current
  return current.filter((apiKey) => apiKey.id !== input.id)
}

export const useApiKeyCreate = () =>
  useResourceMutation<ApiKeyCreateInput, ApiKey, ApiKeyListItem[]>({
    mutationFn: (input) => orpc.v1.apiKey.create.call(input),
    listKey,
    applyOptimistic: applyCreateOptimistic,
    messages: {
      success: "API key creada",
      error: "No se pudo crear la API key",
    },
  })

export const useApiKeyDelete = () =>
  useResourceMutation<{ id: string }, ApiKeyDeleteOutput, ApiKeyListItem[]>({
    mutationFn: (input) => orpc.v1.apiKey.delete.call(input),
    listKey,
    applyOptimistic: applyDeleteOptimistic,
    messages: {
      success: "API key eliminada",
      error: "No se pudo eliminar la API key",
    },
  })
