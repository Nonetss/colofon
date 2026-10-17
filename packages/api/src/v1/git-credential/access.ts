import { hostOf, withCredentials } from "@nonete/content"
import { db } from "@nonete/db"
import { type GitCredential, gitCredential } from "@nonete/db/schema"
import { and, eq } from "drizzle-orm"
import { errors } from "#errors"
import { assertFound } from "#shared/not-found"
import { decryptValues } from "#v1/secret/cipher"

// How a repository clones with a saved credential: the credential is bound
// to its host, and the URL with the token only exists in memory.

const NOT_FOUND = "Credencial no encontrada"

export const UNREADABLE_MESSAGE =
  "La credencial guardada no se puede leer: guárdala de nuevo"

/** The token of `row`, or `null` when it can't be decrypted. */
export function tokenOf(row: GitCredential): string | null {
  const values = decryptValues(row.ciphertext, {
    secretId: row.id,
    userId: row.userId,
  })
  return values?.token ?? null
}

/** The credential `id` of `userId`; another user's reads as not found. */
export async function credentialOwnedBy(
  userId: string,
  id: string
): Promise<GitCredential> {
  const [row] = await db
    .select()
    .from(gitCredential)
    .where(and(eq(gitCredential.id, id), eq(gitCredential.userId, userId)))
  return assertFound(row, NOT_FOUND)
}

/** The credential `id`, whoever owns it. */
export async function credentialById(id: string): Promise<GitCredential> {
  const [row] = await db
    .select()
    .from(gitCredential)
    .where(eq(gitCredential.id, id))
  return assertFound(row, NOT_FOUND)
}

/** Throws unless `credential` is for the host of `url`. */
export function assertHostMatches(
  credential: GitCredential,
  url: string
): void {
  if (hostOf(url) === credential.host) return
  throw errors.BAD_REQUEST({
    message: `Esa credencial es para ${credential.host}: no vale para esta dirección`,
  })
}

/** `url` with the credential's username and token inside it. */
export function urlWithSavedCredential(
  credential: GitCredential,
  url: string
): string {
  const token = tokenOf(credential)
  if (token === null) throw new Error(UNREADABLE_MESSAGE)
  return withCredentials(url, credential.username, token)
}

/**
 * `row` with its `url` carrying the saved credential it references, or `row`
 * itself without one. Throws `UNREADABLE_MESSAGE` when the credential can't be
 * used.
 */
export async function withSavedAccess<
  T extends { url: string; credentialId: string | null },
>(row: T): Promise<T> {
  if (row.credentialId === null) return row
  const credential = await credentialById(row.credentialId).catch(() => {
    throw new Error(UNREADABLE_MESSAGE)
  })
  return { ...row, url: urlWithSavedCredential(credential, row.url) }
}
