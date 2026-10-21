import { db } from "@nonete/db"
import { withKeysetPagination } from "@nonete/db/keyset-pagination"
import {
  type Secret,
  type SecretUsage,
  secret,
  secretShare,
  secretUsage,
  user,
} from "@nonete/db/schema"
import { and, arrayContains, eq, lt, or, sql } from "drizzle-orm"
import type { z } from "zod"
import type { Context } from "#context"
import { errors } from "#errors"
import {
  decryptValues,
  encryptValues,
  type SecretValues,
  secretsEnabled,
} from "#lib/cipher"
import { toIso, toIsoOrNull } from "#shared/dates"
import { assertFound } from "#shared/not-found"
import {
  organizationsOf,
  ownersOrganizations,
  type SharedOrganization,
} from "#shared/organization-shares"
import {
  decodeKeysetCursor,
  encodeKeysetCursor,
  paginate,
} from "#shared/pagination"
import { requireUserId } from "#shared/session"
import type { secretInput } from "#v1/secret/input"
import type { secretOutput } from "#v1/secret/output"
import {
  assertSharedNameFree,
  type SharedSecret,
  sharedSecretsOf,
} from "#v1/secret/sharing"

// The caller's own secrets: every write filters by owner, so another user's
// secret reads as not found, and a member of an organization a secret is
// shared with only lists it (`sharing.ts`). Values go in encrypted and never
// come out; the MCP's `request` tool (`request/`) is the only reader of them.

type SecretOutput = z.infer<typeof secretOutput.secret>
type SharedSecretOutput = z.infer<typeof secretOutput.list>["shared"][number]
type UsageEntry = z.infer<typeof secretOutput.usage>["entries"][number]

/** How long the usage log keeps an entry. */
const USAGE_RETENTION_DAYS = 90

const NOT_FOUND = "Secreto no encontrado"
const DUPLICATE_NAME = "Ya tienes un secreto con ese nombre"

const OUTCOMES = ["sent", "refused", "failed"] as const
type Outcome = (typeof OUTCOMES)[number]

function isOutcome(value: string): value is Outcome {
  return OUTCOMES.some((outcome) => outcome === value)
}

/** Throws unless the secrets feature is configured on this server. */
function assertSecretsEnabled(): void {
  if (secretsEnabled()) return
  throw errors.SERVICE_UNAVAILABLE({
    message: "Los secretos no están configurados en este servidor",
  })
}

/** What both lists show of a secret: never a value. */
function secretFields(row: Secret) {
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
  }
}

function toSecret(
  row: Secret,
  organizations: SharedOrganization[]
): SecretOutput {
  return {
    ...secretFields(row),
    organizations,
    lastUsedAt: toIsoOrNull(row.lastUsedAt),
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  }
}

function toSharedSecret(shared: SharedSecret): SharedSecretOutput {
  return {
    ...secretFields(shared.secret),
    organization: shared.organization,
    ownerName: shared.ownerName,
    prefix: `${shared.organization.slug}/`,
  }
}

type UsageRow = {
  usage: SecretUsage
  caller: { id: string; name: string } | null
}

function toUsageEntry({ usage: row, caller }: UsageRow): UsageEntry {
  if (!isOutcome(row.outcome)) {
    throw new Error(`Unknown secret usage outcome: ${row.outcome}`)
  }
  return {
    id: row.id,
    user: caller,
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

/** One of `userId`'s secrets, with the organizations it is shared with. */
async function findOwned(userId: string, id: string) {
  const row = await db.query.secret.findFirst({
    where: { id, userId },
    with: { shares: { with: { organization: true } } },
  })
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
    if (!secretsEnabled()) return { enabled: false, secrets: [], shared: [] }
    const [rows, shared] = await Promise.all([
      db.query.secret.findMany({
        where: { userId },
        with: { shares: { with: { organization: true } } },
        orderBy: { name: "asc" },
      }),
      sharedSecretsOf(userId),
    ])
    return {
      enabled: true,
      secrets: rows.map((row) => toSecret(row, organizationsOf(row.shares))),
      shared: shared.map(toSharedSecret),
    }
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
    return toSecret(insertedRow(row), [])
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
    const organizations = organizationsOf(current.shares)
    if (input.name !== undefined && input.name !== current.name) {
      await assertNameFree(userId, input.name, current.id)
      await assertSharedNameFree(
        input.name,
        organizations.map((each) => each.id),
        current.id
      )
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
    return toSecret(insertedRow(row), organizations)
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

  async share({
    context,
    input,
  }: {
    context: Context
    input: z.infer<typeof secretInput.share>
  }) {
    assertSecretsEnabled()
    const userId = requireUserId(context)
    const current = await findOwned(userId, input.id)
    const wanted = [...new Set(input.organizationIds)]
    const memberships = await ownersOrganizations(userId, wanted)
    if (memberships.length !== wanted.length)
      throw errors.NOT_FOUND({ message: "Organización no encontrada" })
    await assertSharedNameFree(current.name, wanted, current.id)
    await db.transaction(async (tx) => {
      await tx.delete(secretShare).where(eq(secretShare.secretId, current.id))
      if (wanted.length === 0) return
      await tx.insert(secretShare).values(
        wanted.map((organizationId) => ({
          secretId: current.id,
          organizationId,
        }))
      )
    })
    return toSecret(current, organizationsOf(memberships))
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
    // The caller's own calls, and anyone's calls with a secret they own.
    const owned = db
      .select({ id: secret.id })
      .from(secret)
      .where(eq(secret.userId, userId))
    const filters = [
      or(
        eq(secretUsage.userId, userId),
        sql`${secretUsage.secretIds} && array(${owned})`
      ),
    ]
    if (input.secretId !== undefined) {
      filters.push(arrayContains(secretUsage.secretIds, [input.secretId]))
    }
    const rows = await withKeysetPagination(
      db
        .select({
          usage: secretUsage,
          caller: { id: user.id, name: user.name },
        })
        .from(secretUsage)
        .leftJoin(user, eq(user.id, secretUsage.userId))
        .$dynamic(),
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
  lastRow: UsageRow | undefined
): string | null {
  if (!hasMore || !lastRow) return null
  return encodeKeysetCursor(lastRow.usage.createdAt, lastRow.usage.id)
}
