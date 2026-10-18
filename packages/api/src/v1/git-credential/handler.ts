import { db } from "@nonete/db"
import {
  contentRepository,
  type GitCredential,
  gitCredential,
} from "@nonete/db/schema"
import { and, asc, eq, inArray } from "drizzle-orm"
import type { z } from "zod"
import type { Context } from "#context"
import { errors } from "#errors"
import { encryptValues, secretsEnabled } from "#lib/cipher"
import { toIso } from "#shared/dates"
import { requireUserId } from "#shared/session"
import { credentialOwnedBy, tokenOf } from "#v1/git-credential/access"
import type { gitCredentialInput } from "#v1/git-credential/input"
import type { gitCredentialOutput } from "#v1/git-credential/output"

// The caller's own git credentials: every query filters by owner. The token
// goes in encrypted and never comes out; a repository clones with it through
// `access.ts`.

type CredentialOutput = z.infer<typeof gitCredentialOutput.credential>

/** Throws unless this server can store credentials. */
function assertEnabled(): void {
  if (secretsEnabled()) return
  throw errors.SERVICE_UNAVAILABLE({
    message: "Las credenciales no se pueden guardar en este servidor",
  })
}

function toCredential(row: GitCredential, inUse: boolean): CredentialOutput {
  return {
    id: row.id,
    host: row.host,
    username: row.username,
    inUse,
    unreadable: tokenOf(row) === null,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  }
}

/** Which of `ids` a repository clones with. */
async function idsInUse(ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set()
  const rows = await db
    .select({ credentialId: contentRepository.credentialId })
    .from(contentRepository)
    .where(inArray(contentRepository.credentialId, ids))
  return new Set(rows.flatMap((row) => row.credentialId ?? []))
}

function savedRow(row: GitCredential | undefined): GitCredential {
  if (row) return row
  throw errors.INTERNAL_SERVER_ERROR({
    message: "Git credential write returned no row",
  })
}

export const gitCredentialHandler = {
  async list({ context }: { context: Context }) {
    const userId = requireUserId(context)
    if (!secretsEnabled()) return { enabled: false, credentials: [] }
    const rows = await db
      .select()
      .from(gitCredential)
      .where(eq(gitCredential.userId, userId))
      .orderBy(asc(gitCredential.host), asc(gitCredential.username))
    const used = await idsInUse(rows.map((row) => row.id))
    return {
      enabled: true,
      credentials: rows.map((row) => toCredential(row, used.has(row.id))),
    }
  },

  async save({
    context,
    input,
  }: {
    context: Context
    input: z.infer<typeof gitCredentialInput.save>
  }): Promise<CredentialOutput> {
    assertEnabled()
    const userId = requireUserId(context)
    const [existing] = await db
      .select()
      .from(gitCredential)
      .where(
        and(
          eq(gitCredential.userId, userId),
          eq(gitCredential.host, input.host),
          eq(gitCredential.username, input.username)
        )
      )
    if (existing) {
      const [row] = await db
        .update(gitCredential)
        .set({
          ciphertext: encryptValues(
            { token: input.token },
            { secretId: existing.id, userId }
          ),
        })
        .where(eq(gitCredential.id, existing.id))
        .returning()
      const saved = savedRow(row)
      const used = await idsInUse([saved.id])
      return toCredential(saved, used.has(saved.id))
    }
    // Generated here so the ciphertext can be bound to the row's id.
    const id = crypto.randomUUID()
    const [row] = await db
      .insert(gitCredential)
      .values({
        id,
        userId,
        host: input.host,
        username: input.username,
        ciphertext: encryptValues(
          { token: input.token },
          { secretId: id, userId }
        ),
      })
      .returning()
    return toCredential(savedRow(row), false)
  },

  async delete({
    context,
    input,
  }: {
    context: Context
    input: z.infer<typeof gitCredentialInput.delete>
  }): Promise<z.infer<typeof gitCredentialOutput.delete>> {
    const userId = requireUserId(context)
    const row = await credentialOwnedBy(userId, input.id)
    const used = await idsInUse([row.id])
    if (used.has(row.id)) {
      throw errors.CONFLICT({
        message:
          "Hay repositorios que usan esta credencial: cámbiales la credencial antes de borrarla",
      })
    }
    await db.delete(gitCredential).where(eq(gitCredential.id, row.id))
    return { id: row.id, success: true }
  },
}
