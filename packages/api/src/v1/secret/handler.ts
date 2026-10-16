import { db } from "@nonete/db"
import { withKeysetPagination } from "@nonete/db/keyset-pagination"
import {
  type Secret,
  type SecretUsage,
  secret,
  secretUsage,
} from "@nonete/db/schema"
import { and, arrayContains, asc, eq, lt } from "drizzle-orm"
import type { z } from "zod"
import type { Context } from "#context"
import { errors } from "#errors"
import { toIso, toIsoOrNull } from "#shared/dates"
import { assertFound } from "#shared/not-found"
import {
  decodeKeysetCursor,
  encodeKeysetCursor,
  paginate,
} from "#shared/pagination"
import {
  decryptValues,
  encryptValues,
  type SecretValues,
  secretsEnabled,
} from "#v1/secret/cipher"
import type { secretInput } from "#v1/secret/input"
import type { secretOutput } from "#v1/secret/output"

// The caller's own secrets: every query filters by owner, so another user's
// secret reads as not found. Values go in encrypted and never come out; the
// MCP's `request` tool (`request/`) is the only reader of them.

type SecretOutput = z.infer<typeof secretOutput.secret>
type UsageEntry = z.infer<typeof secretOutput.usage>["entries"][number]

/** How long the usage log keeps an entry. */
export const USAGE_RETENTION_DAYS = 90

const NOT_FOUND = "Secreto no encontrado"
const DUPLICATE_NAME = "Ya tienes un secreto con ese nombre"

const OUTCOMES = ["sent", "refused", "failed"] as const
type Outcome = (typeof OUTCOMES)[number]

function isOutcome(value: string): value is Outcome {
  return OUTCOMES.some((outcome) => outcome === value)
}

/** Throws unless the secrets feature is configured on this server. */
export function assertSecretsEnabled(): void {
  if (secretsEnabled()) return
  throw errors.SERVICE_UNAVAILABLE({
    message: "Los secretos no están configurados en este servidor",
  })
}

function requireUserId(context: Context): string {
  if (!context.user) throw errors.UNAUTHORIZED()
  return context.user.id
}

function toSecret(row: Secret): SecretOutput {
  const values = decryptValues(row.ciphertext, {
    secretId: row.id,
    userId: row.userId,
  })
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    fields: row.fieldNames,
    origins: row.origins,
    allowWrite: row.allowWrite,
    allowInUrl: row.allowInUrl,
    allowInBody: row.allowInBody,
    unreadable: values === null,
    lastUsedAt: toIsoOrNull(row.lastUsedAt),
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  }
}

function toUsageEntry(row: SecretUsage): UsageEntry {
  if (!isOutcome(row.outcome)) {
    throw new Error(`Unknown secret usage outcome: ${row.outcome}`)
  }
  return {
    id: row.id,
    apiKeyId: row.apiKeyId,
    secretNames: row.secretNames,
    method: row.method,
    url: row.url,
    outcome: row.outcome,
    status: row.status,
    detail: row.detail,
    durationMs: row.durationMs,
    createdAt: toIso(row.createdAt),
  }
}

async function findOwned(userId: string, id: string): Promise<Secret> {
  const [row] = await db
    .select()
    .from(secret)
    .where(and(eq(secret.id, id), eq(secret.userId, userId)))
  return assertFound(row, NOT_FOUND)
}

async function assertNameFree(
  userId: string,
  name: string,
  exceptId: string | null
): Promise<void> {
  const [existing] = await db
    .select({ id: secret.id })
    .from(secret)
    .where(and(eq(secret.userId, userId), eq(secret.name, name)))
  if (existing && existing.id !== exceptId) {
    throw errors.CONFLICT({ message: DUPLICATE_NAME })
  }
}

/**
 * The values after an update's field list: a listed value replaces the
 * stored one, a listed field without one keeps it, the rest are dropped.
 */
function mergedValues(
  fields: { name: string; value?: string }[],
  stored: SecretValues | null
): SecretValues {
  const values: SecretValues = {}
  for (const field of fields) {
    if (field.value !== undefined) {
      values[field.name] = field.value
      continue
    }
    const kept = stored?.[field.name]
    if (kept === undefined) {
      throw errors.BAD_REQUEST({
        message: `El campo ${field.name} no tiene un valor guardado: escríbelo`,
      })
    }
    values[field.name] = kept
  }
  return values
}

/** The columns an update's field list rewrites, or none without one. */
function replacedFields(
  fields: { name: string; value?: string }[] | undefined,
  current: Secret
): { fieldNames: string[]; ciphertext: string } | undefined {
  if (fields === undefined) return undefined
  const binding = { secretId: current.id, userId: current.userId }
  const stored = decryptValues(current.ciphertext, binding)
  return {
    fieldNames: fields.map((field) => field.name),
    ciphertext: encryptValues(mergedValues(fields, stored), binding),
  }
}

function insertedRow(row: Secret | undefined): Secret {
  if (row) return row
  throw errors.INTERNAL_SERVER_ERROR({
    message: "Secret write returned no row",
  })
}

export const secretHandler = {
  async list({ context }: { context: Context }) {
    const userId = requireUserId(context)
    if (!secretsEnabled()) return { enabled: false, secrets: [] }
    const rows = await db
      .select()
      .from(secret)
      .where(eq(secret.userId, userId))
      .orderBy(asc(secret.name))
    return { enabled: true, secrets: rows.map(toSecret) }
  },

  async create({
    context,
    input,
  }: {
    context: Context
    input: z.infer<typeof secretInput.create>
  }) {
    assertSecretsEnabled()
    const userId = requireUserId(context)
    await assertNameFree(userId, input.name, null)
    // Generated here so the ciphertext can be bound to the row's id.
    const id = crypto.randomUUID()
    const values = Object.fromEntries(
      input.fields.map((field) => [field.name, field.value])
    )
    const [row] = await db
      .insert(secret)
      .values({
        id,
        userId,
        name: input.name,
        description: input.description,
        fieldNames: input.fields.map((field) => field.name),
        ciphertext: encryptValues(values, { secretId: id, userId }),
        origins: input.origins,
        allowWrite: input.allowWrite,
        allowInUrl: input.allowInUrl,
        allowInBody: input.allowInBody,
      })
      .returning()
    return toSecret(insertedRow(row))
  },

  async update({
    context,
    input,
  }: {
    context: Context
    input: z.infer<typeof secretInput.update>
  }) {
    assertSecretsEnabled()
    const userId = requireUserId(context)
    const current = await findOwned(userId, input.id)
    if (input.name !== undefined && input.name !== current.name) {
      await assertNameFree(userId, input.name, current.id)
    }

    const replaced = replacedFields(input.fields, current)

    const [row] = await db
      .update(secret)
      .set({
        ...(input.name !== undefined && { name: input.name }),
        ...(input.description !== undefined && {
          description: input.description,
        }),
        ...(input.origins !== undefined && { origins: input.origins }),
        ...(input.allowWrite !== undefined && { allowWrite: input.allowWrite }),
        ...(input.allowInUrl !== undefined && { allowInUrl: input.allowInUrl }),
        ...(input.allowInBody !== undefined && {
          allowInBody: input.allowInBody,
        }),
        ...replaced,
      })
      .where(and(eq(secret.id, current.id), eq(secret.userId, userId)))
      .returning()
    return toSecret(insertedRow(row))
  },

  async delete({
    context,
    input,
  }: {
    context: Context
    input: z.infer<typeof secretInput.delete>
  }) {
    assertSecretsEnabled()
    const userId = requireUserId(context)
    const [row] = await db
      .delete(secret)
      .where(and(eq(secret.id, input.id), eq(secret.userId, userId)))
      .returning({ id: secret.id })
    const deleted = assertFound(row, NOT_FOUND)
    return { id: deleted.id, success: true }
  },

  async usage({
    context,
    input,
  }: {
    context: Context
    input: z.infer<typeof secretInput.usage>
  }) {
    assertSecretsEnabled()
    const userId = requireUserId(context)
    const cursor = decodeKeysetCursor(input.cursor)
    const filters = [eq(secretUsage.userId, userId)]
    if (input.secretId !== undefined) {
      filters.push(arrayContains(secretUsage.secretIds, [input.secretId]))
    }
    const rows = await withKeysetPagination(
      db.select().from(secretUsage).$dynamic(),
      {
        orderColumns: [secretUsage.createdAt, secretUsage.id],
        cursor,
        filters,
        limit: input.limit + 1,
      }
    )
    const { page, hasMore, lastRow } = paginate(rows, input.limit)
    return {
      entries: page.map(toUsageEntry),
      nextCursor: nextUsageCursor(hasMore, lastRow),
    }
  },

  /** Deletes the usage entries older than the retention period. */
  async purgeUsage() {
    const cutoff = new Date(
      Date.now() - USAGE_RETENTION_DAYS * 24 * 60 * 60 * 1000
    )
    const rows = await db
      .delete(secretUsage)
      .where(lt(secretUsage.createdAt, cutoff))
      .returning({ id: secretUsage.id })
    return { deleted: rows.length }
  },
}

function nextUsageCursor(
  hasMore: boolean,
  lastRow: SecretUsage | undefined
): string | null {
  if (!hasMore || !lastRow) return null
  return encodeKeysetCursor(lastRow.createdAt, lastRow.id)
}
