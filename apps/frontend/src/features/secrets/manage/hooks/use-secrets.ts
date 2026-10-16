import { skipToken, useInfiniteQuery, useQuery } from "@tanstack/react-query"
import type {
  SecretCreateInput,
  SecretUpdateInput,
} from "@/features/secrets/manage/model/types"
import { useOrpcMutation } from "@/hooks/use-orpc-mutation"
import { orpc } from "@/lib/orpc"

/** Every read of the secrets: the list and each secret's usage. */
const secretsKey = orpc.v1.secret.key()

const USAGE_PAGE_SIZE = 20

export function useSecretsList() {
  return useQuery(orpc.v1.secret.list.queryOptions())
}

export function useSecretCreate() {
  return useOrpcMutation({
    mutationFn: (input: SecretCreateInput) => orpc.v1.secret.create.call(input),
    success: "Secreto creado",
    error: "No se pudo crear el secreto",
    invalidate: [secretsKey],
  })
}

export function useSecretUpdate() {
  return useOrpcMutation({
    mutationFn: (input: SecretUpdateInput) => orpc.v1.secret.update.call(input),
    success: "Secreto guardado",
    error: "No se pudo guardar el secreto",
    invalidate: [secretsKey],
  })
}

export function useSecretDelete() {
  return useOrpcMutation({
    mutationFn: (input: { id: string }) => orpc.v1.secret.delete.call(input),
    success: "Secreto eliminado",
    error: "No se pudo eliminar el secreto",
    invalidate: [secretsKey],
  })
}

function usageInput(secretId: string | null) {
  if (secretId === null) return skipToken
  return (cursor: string | null) => ({
    secretId,
    cursor,
    limit: USAGE_PAGE_SIZE,
  })
}

/** One secret's recent calls, newest first; idle while none is chosen. */
export function useSecretUsage(secretId: string | null) {
  return useInfiniteQuery(
    orpc.v1.secret.usage.infiniteOptions({
      input: usageInput(secretId),
      initialPageParam: null,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    })
  )
}
