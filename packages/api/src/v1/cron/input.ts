import { CRON_RUN_SORT_KEYS } from "@nonete/cron"
import { z } from "zod"

import { paginationLimit, sortedPaginationCursor } from "#shared/pagination"

/** The orderings of a job's run history (`listRuns`' `sort`). */
export { CRON_RUN_SORT_KEYS }

const payloadSchema = z.record(z.string(), z.unknown()).nullable().optional()

export const cronInput = {
  get: z.object({
    id: z.uuid().describe("Cron job UUID"),
  }),

  create: z.object({
    name: z.string().min(1).describe("Unique job name"),
    description: z
      .string()
      .nullable()
      .optional()
      .describe("Human-readable description"),
    cronExpression: z
      .string()
      .min(1)
      .describe("UTC cron expression (Bun.cron)"),
    handlerKey: z
      .string()
      .min(1)
      .describe("Dot path of a cron-eligible procedure in v1Router"),
    enabled: z
      .boolean()
      .default(true)
      .describe("Whether the job should be scheduled immediately"),
    userId: z
      .string()
      .min(1)
      .nullable()
      .optional()
      .describe(
        "User the job runs as; defaults to the caller, null runs it with no user"
      ),
    payload: payloadSchema.describe(
      "JSON payload passed to the handler; null/omit for none"
    ),
  }),

  setEnabled: z.object({
    id: z.uuid().describe("Cron job UUID"),
    enabled: z.boolean().describe("Whether the job should be scheduled"),
  }),

  update: z.object({
    id: z.uuid().describe("Cron job UUID"),
    name: z.string().min(1).optional().describe("Unique job name"),
    description: z
      .string()
      .nullable()
      .optional()
      .describe("Human-readable description; null clears it"),
    cronExpression: z
      .string()
      .min(1)
      .optional()
      .describe("UTC cron expression (Bun.cron)"),
    handlerKey: z
      .string()
      .min(1)
      .optional()
      .describe("Dot path of a cron-eligible procedure in v1Router"),
    userId: z
      .string()
      .min(1)
      .nullable()
      .optional()
      .describe("User the job runs as; null runs it with no user"),
    payload: payloadSchema.describe(
      "JSON payload passed to the handler; null clears it"
    ),
  }),

  remove: z.object({
    id: z.uuid().describe("Cron job UUID"),
  }),

  runNow: z.object({
    id: z.uuid().describe("Cron job UUID"),
  }),

  listRuns: z.object({
    jobId: z.uuid().describe("Cron job UUID"),
    statuses: z
      .array(z.enum(["running", "success", "failed", "skipped"]))
      .optional()
      .describe(
        "Keep only runs with one of these statuses; omitted or empty lists every status"
      ),
    sort: z
      .enum(CRON_RUN_SORT_KEYS)
      .default("startedAt")
      .describe(
        "Ordering: start time (the default), status (running, failed, skipped, success) or duration (runs still going last); ties go newest first"
      ),
    order: z
      .enum(["asc", "desc"])
      .default("desc")
      .describe("Direction of the ordering: desc (the default) or asc"),
    limit: paginationLimit(50, 200),
    cursor: sortedPaginationCursor(),
  }),

  watchRuns: z.object({
    jobId: z.uuid().describe("Cron job UUID"),
  }),
}
