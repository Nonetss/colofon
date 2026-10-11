import type { db as DbInstance } from "@nonete/db"
import { cronJob, cronRun } from "@nonete/db/schema/cron"
import {
  type SortedCursorPosition,
  type SortOrder,
  sortedKeyset,
} from "@nonete/db/sorted-keyset"
import {
  and,
  eq,
  getTableColumns,
  inArray,
  type SQLWrapper,
  sql,
} from "drizzle-orm"
import { z } from "zod"

import { assertValidCronExpression, nextRunAt } from "#cron-expression"
import {
  CronNotFoundError,
  CronReadOnlyError,
  CronValidationError,
  isUniqueViolation,
} from "#errors"

export type Db = typeof DbInstance

function jobFilter(jobId: string | undefined) {
  if (!jobId) return undefined
  return eq(cronRun.jobId, jobId)
}

function statusFilter(statuses: readonly CronRunStatus[] | undefined) {
  if (!statuses || statuses.length === 0) return undefined
  return inArray(cronRun.status, [...statuses])
}

/** What each run ordering sorts by. Status ranks what needs attention
 *  first; duration is NULL while the run is still going. */
const runSortExpression: Record<CronRunSortKey, SQLWrapper> = {
  startedAt: cronRun.startedAt,
  status: sql`case ${cronRun.status} when 'running' then 0 when 'failed' then 1 when 'skipped' then 2 else 3 end`,
  duration: sql`${cronRun.finishedAt} - ${cronRun.startedAt}`,
}

const payloadSchema = z.record(z.string(), z.unknown()).nullable().optional()

export const createCronJobInput = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  cronExpression: z.string().min(1),
  timezone: z.string().min(1).default("UTC"),
  enabled: z.boolean().default(false),
  handlerKey: z.string().min(1),
  userId: z.string().min(1).nullable().optional(),
  payload: payloadSchema,
})

export const updateCronJobInput = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  cronExpression: z.string().min(1).optional(),
  timezone: z.string().min(1).optional(),
  enabled: z.boolean().optional(),
  handlerKey: z.string().min(1).optional(),
  userId: z.string().min(1).nullable().optional(),
  payload: payloadSchema,
})

export type CreateCronJobInput = z.infer<typeof createCronJobInput>
export type UpdateCronJobInput = z.infer<typeof updateCronJobInput>

export type CronRunStatus = "running" | "success" | "failed" | "skipped"

/** The orderings of a job's run history. */
export const CRON_RUN_SORT_KEYS = ["startedAt", "status", "duration"] as const

export type CronRunSortKey = (typeof CRON_RUN_SORT_KEYS)[number]

export type ListRunsInput = {
  jobId?: string
  /** Runs with any of these statuses; omitted or empty means every status. */
  statuses?: readonly CronRunStatus[]
  limit?: number
  /** Start time (the default), status (running, failed, skipped, success)
   *  or duration (still-running runs last). */
  sort?: CronRunSortKey
  /** `desc` (the default) or `asc`. */
  order?: SortOrder
  /** Only rows strictly past this position in the requested order. */
  cursor?: SortedCursorPosition
}

/** A listed run plus what its next-page cursor needs: the sort key as text
 *  and the start time as text (a `Date` loses the microseconds). */
export type ListedCronRun = typeof cronRun.$inferSelect & {
  sortValue: string | null
  cursorStartedAt: string
}

export type CronService = {
  list: () => Promise<(typeof cronJob.$inferSelect)[]>
  get: (id: string) => Promise<typeof cronJob.$inferSelect>
  create: (input: CreateCronJobInput) => Promise<typeof cronJob.$inferSelect>
  update: (
    id: string,
    input: UpdateCronJobInput
  ) => Promise<typeof cronJob.$inferSelect>
  setEnabled: (
    id: string,
    enabled: boolean
  ) => Promise<typeof cronJob.$inferSelect>
  remove: (id: string) => Promise<void>
  listRuns: (input?: ListRunsInput) => Promise<ListedCronRun[]>
  getRun: (id: string) => Promise<typeof cronRun.$inferSelect>
  runNow: (id: string) => Promise<typeof cronRun.$inferSelect>
}

export type CreateCronServiceOptions = {
  db: Db
  onChange?: () => void | Promise<void>
  /** When set, create/update reject unknown handler keys before writing. */
  isValidHandlerKey?: (key: string) => boolean
  /** Wires manual "run now" triggers to the scheduler's execution path. */
  triggerRun?: (id: string) => Promise<typeof cronRun.$inferSelect>
}

export function createCronService({
  db,
  onChange,
  isValidHandlerKey,
  triggerRun,
}: CreateCronServiceOptions): CronService {
  const notify = async () => {
    await onChange?.()
  }

  const assertHandlerKey = (key: string) => {
    if (isValidHandlerKey && !isValidHandlerKey(key)) {
      throw new CronValidationError(`Unknown cron handler key: ${key}`)
    }
  }

  const mapUniqueNameError = (error: unknown, name: string): never => {
    if (isUniqueViolation(error)) {
      throw new CronValidationError(`A cron job named "${name}" already exists`)
    }
    throw error
  }

  const getOrThrow = async (id: string) => {
    const row = await db.query.cronJob.findFirst({
      where: { id, deletedAt: { isNull: true } },
    })
    if (!row) {
      throw new CronNotFoundError(`Cron job not found: ${id}`)
    }
    return row
  }

  // Code-declared jobs are written only by the startup sync.
  const getWritableOrThrow = async (id: string) => {
    const row = await getOrThrow(id)
    if (row.source === "code") {
      throw new CronReadOnlyError(
        `Cron job ${id} is declared in code and cannot be modified`
      )
    }
    return row
  }

  return {
    async list() {
      return db.query.cronJob.findMany({
        where: { deletedAt: { isNull: true } },
        orderBy: { name: "asc" },
      })
    },

    async get(id) {
      return getOrThrow(id)
    },

    async create(raw) {
      const input = createCronJobInput.parse(raw)
      assertValidCronExpression(input.cronExpression, input.timezone)
      assertHandlerKey(input.handlerKey)

      try {
        const [row] = await db
          .insert(cronJob)
          .values({
            name: input.name,
            description: input.description ?? null,
            cronExpression: input.cronExpression,
            timezone: input.timezone,
            enabled: input.enabled,
            handlerKey: input.handlerKey,
            userId: input.userId ?? null,
            payload: input.payload ?? null,
            nextRunAt: input.enabled ? nextRunAt(input.cronExpression) : null,
          })
          .returning()

        if (!row) {
          throw new Error("Failed to create cron job")
        }

        await notify()
        return row
      } catch (error) {
        if (
          error instanceof CronValidationError ||
          error instanceof CronNotFoundError
        ) {
          throw error
        }
        mapUniqueNameError(error, input.name)
        throw error
      }
    },

    async update(id, raw) {
      const existing = await getWritableOrThrow(id)
      const input = updateCronJobInput.parse(raw)

      const cronExpression = input.cronExpression ?? existing.cronExpression
      const timezone = input.timezone ?? existing.timezone
      const enabled = input.enabled ?? existing.enabled

      if (input.cronExpression !== undefined || input.timezone !== undefined) {
        assertValidCronExpression(cronExpression, timezone)
      }

      if (input.handlerKey !== undefined) {
        assertHandlerKey(input.handlerKey)
      }

      const [row] = await db
        .update(cronJob)
        .set({
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.description !== undefined
            ? { description: input.description }
            : {}),
          ...(input.cronExpression !== undefined
            ? { cronExpression: input.cronExpression }
            : {}),
          ...(input.timezone !== undefined ? { timezone: input.timezone } : {}),
          ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
          ...(input.handlerKey !== undefined
            ? { handlerKey: input.handlerKey }
            : {}),
          ...(input.userId !== undefined ? { userId: input.userId } : {}),
          ...(input.payload !== undefined ? { payload: input.payload } : {}),
          nextRunAt: enabled ? nextRunAt(cronExpression) : null,
        })
        .where(eq(cronJob.id, id))
        .returning()

      if (!row) {
        throw new CronNotFoundError(`Cron job not found: ${id}`)
      }

      await notify()
      return row
    },

    async setEnabled(id, enabled) {
      return this.update(id, { enabled })
    },

    async remove(id) {
      await getWritableOrThrow(id)
      // Soft delete: keep the row (and its cron_run history) around, just
      // stop it from running and from showing up in list()/get().
      await db
        .update(cronJob)
        .set({ deletedAt: new Date(), enabled: false, nextRunAt: null })
        .where(eq(cronJob.id, id))
      await notify()
    },

    async listRuns(input = {}) {
      const keyset = sortedKeyset({
        primary: runSortExpression[input.sort ?? "startedAt"],
        order: input.order ?? "desc",
        tiebreak: [cronRun.startedAt, cronRun.id],
        tiebreakOrder: "desc",
      })
      return db
        .select({
          ...getTableColumns(cronRun),
          sortValue: keyset.sortValue,
          cursorStartedAt: sql<string>`${cronRun.startedAt}::text`,
        })
        .from(cronRun)
        .where(
          and(
            jobFilter(input.jobId),
            statusFilter(input.statuses),
            keyset.after(input.cursor)
          )
        )
        .orderBy(...keyset.orderBy)
        .limit(input.limit ?? 50)
    },

    async getRun(id) {
      const row = await db.query.cronRun.findFirst({
        where: { id },
      })
      if (!row) {
        throw new CronNotFoundError(`Cron run not found: ${id}`)
      }
      return row
    },

    async runNow(id) {
      await getWritableOrThrow(id)
      if (!triggerRun) {
        throw new Error(
          "Cron service was not configured with a triggerRun handler"
        )
      }
      return triggerRun(id)
    },
  }
}
