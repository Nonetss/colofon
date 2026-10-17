import { useQuery } from "@tanstack/react-query"
import type { SaveGitCredentialInput } from "@/features/content-repositories/manage/model/credential-choice"
import { useOrpcMutation } from "@/hooks/use-orpc-mutation"
import { orpc } from "@/lib/orpc"

const credentialsKey = orpc.v1.gitCredential.key()
// A credential's `inUse` follows the repositories that reference it.
const repositoryKeys = [
  orpc.v1.content.listMyRepositories.queryKey(),
  orpc.v1.content.listRepositories.queryKey(),
]

export const useGitCredentials = () =>
  useQuery(orpc.v1.gitCredential.list.queryOptions())

export const useGitCredentialSave = () =>
  useOrpcMutation({
    mutationFn: (input: SaveGitCredentialInput) =>
      orpc.v1.gitCredential.save.call(input),
    success: "Credencial guardada",
    error: "No se pudo guardar la credencial",
    invalidate: [credentialsKey],
  })

export const useGitCredentialReplace = () =>
  useOrpcMutation({
    mutationFn: (input: SaveGitCredentialInput) =>
      orpc.v1.gitCredential.save.call(input),
    success: "Token actualizado",
    error: "No se pudo actualizar el token",
    invalidate: [credentialsKey],
  })

export const useGitCredentialDelete = () =>
  useOrpcMutation({
    mutationFn: (input: { id: string }) =>
      orpc.v1.gitCredential.delete.call(input),
    success: "Credencial eliminada",
    error: "No se pudo eliminar la credencial",
    invalidate: [credentialsKey, ...repositoryKeys],
  })
