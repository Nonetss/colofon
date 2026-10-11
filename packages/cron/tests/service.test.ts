import { beforeEach, describe, expect, mock, test } from "bun:test"
import {
  createFakeDb,
  cronJobRow,
  cronRunRow,
  stepArgs,
} from "@nonete/db/testing"
import type { SQL } from "drizzle-orm"
import { PgDialect } from "drizzle-orm/pg-core"

import {
  CronNotFoundError,
  CronReadOnlyError,
  CronValidationError,
} from "#errors"
import { type CreateCronJobInput, createCronService } from "#service"

const fake = createFakeDb()
const onChange = mock(async () => {})
const triggerRun = mock(async (id: string) => cronRunRow({ jobId: id }))

const service = createCronService({
  db: fake.db,
  onChange,
  isValidHandlerKey: (key) => key.startsWith("v1."),
  triggerRun,
})

const input: CreateCronJobInput = {
  name: "Nightly cleanup",
  cronExpression: "0 3 * * *",
  timezone: "UTC",
  enabled: false,
  handlerKey: "v1.maintenance.cleanup",
}

const codeJob = cronJobRow({ id: "job-code", source: "code" })

beforeEach(() => {
  fake.reset()
  onChange.mockClear()
  triggerRun.mockClear()
})

describe("cron service create", () => {
  test("inserts the job and notifies the change", async () => {
    const row = cronJobRow({ enabled: false })
    fake.queue("insert", [row])

    expect(await service.create(input)).toEqual(row)
    const [insert] = fake.calls("insert")
    expect(insert && stepArgs(insert, "values")[0]).toMatchObject({
      name: input.name,
      enabled: false,
      nextRunAt: null,
      userId: null,
    })
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  test.each([
    ["an invalid expression", { cronExpression: "nope" }],
    ["a non-UTC timezone", { timezone: "Europe/Madrid" }],
    ["an unknown handler key", { handlerKey: "unknown.key" }],
  ])("rejects %s before writing", async (_, patch) => {
    await expect(service.create({ ...input, ...patch })).rejects.toThrow(
      CronValidationError
    )
    expect(fake.calls("insert")).toEqual([])
    expect(onChange).not.toHaveBeenCalled()
  })

  test("turns a duplicate name into a validation error", async () => {
    fake.queueError(
      "insert",
      new Error("duplicate", { cause: { code: "23505" } })
    )

    await expect(service.create(input)).rejects.toThrow(
      `A cron job named "${input.name}" already exists`
    )
  })
})

const dialect = new PgDialect()

/** The SQL of the `listRuns` query's `where` and `orderBy` steps. */
function listRunsQuery() {
  const [call] = fake.calls("select")
  if (!call) throw new Error("listRuns made no query")
  const render = (fragment: unknown) => {
    if (!isSql(fragment)) throw new Error("not an SQL fragment")
    return dialect.sqlToQuery(fragment).sql
  }
  return {
    where: render(stepArgs(call, "where")[0]),
    orderBy: stepArgs(call, "orderBy").map(render),
  }
}

function isSql(value: unknown): value is SQL {
  return typeof value === "object" && value !== null && "queryChunks" in value
}

const RUN_CURSOR = {
  p: "2026-01-02 00:00:00",
  t: ["2026-01-02 00:00:00", "r2"],
}

describe("cron service reads", () => {
  test("listRuns pages newest first by default, ties newest first", async () => {
    fake.queue("select", [])

    await service.listRuns({ jobId: "job-1" })

    const query = listRunsQuery()
    expect(query.orderBy).toEqual([
      '"cron_run"."started_at" desc nulls last',
      '"cron_run"."started_at" desc',
      '"cron_run"."id" desc',
    ])
    expect(query.where).toBe('"cron_run"."job_id" = $1')
  })

  test("listRuns continues after the cursor in the requested order", async () => {
    fake.queue("select", [])

    await service.listRuns({ jobId: "job-1", order: "asc", cursor: RUN_CURSOR })

    const query = listRunsQuery()
    expect(query.orderBy[0]).toBe('"cron_run"."started_at" asc nulls last')
    expect(query.where).toContain('"cron_run"."started_at" > $')
    expect(query.where).toContain(
      '("cron_run"."started_at", "cron_run"."id") < ($'
    )
  })

  test("listRuns sorts by status rank and by duration", async () => {
    fake.queue("select", [])
    fake.queue("select", [])

    await service.listRuns({ sort: "status", order: "asc" })
    await service.listRuns({ sort: "duration", order: "desc" })

    const [byStatus, byDuration] = fake.calls("select")
    if (!byStatus || !byDuration) throw new Error("missing queries")
    const first = (call: typeof byStatus) => {
      const [term] = stepArgs(call, "orderBy")
      if (!isSql(term)) throw new Error("not an SQL fragment")
      return dialect.sqlToQuery(term).sql
    }
    expect(first(byStatus)).toBe(
      "case \"cron_run\".\"status\" when 'running' then 0 when 'failed' then 1 when 'skipped' then 2 else 3 end asc nulls last"
    )
    expect(first(byDuration)).toBe(
      '"cron_run"."finished_at" - "cron_run"."started_at" desc nulls last'
    )
  })

  test("listRuns keeps only the requested statuses", async () => {
    fake.queue("select", [])

    await service.listRuns({ jobId: "job-1", statuses: ["failed", "skipped"] })

    expect(listRunsQuery().where).toBe(
      '(("cron_run"."job_id" = $1) and ("cron_run"."status" in ($2, $3)))'
    )
  })

  test("listRuns ignores an empty status list", async () => {
    fake.queue("select", [])

    await service.listRuns({ jobId: "job-1", statuses: [] })

    expect(listRunsQuery().where).toBe('"cron_run"."job_id" = $1')
  })

  test("get fails with CronNotFoundError for a missing job", async () => {
    fake.queue("query.cronJob.findFirst", undefined)
    await expect(service.get("missing")).rejects.toThrow(CronNotFoundError)
  })

  test("getRun fails with CronNotFoundError for a missing run", async () => {
    fake.queue("query.cronRun.findFirst", undefined)
    await expect(service.getRun("missing")).rejects.toThrow(CronNotFoundError)
  })
})

describe("cron service mutations", () => {
  test("update writes only the given fields plus nextRunAt", async () => {
    const existing = cronJobRow({ enabled: true })
    const updated = cronJobRow({ name: "Renamed" })
    fake.queue("query.cronJob.findFirst", existing)
    fake.queue("update", [updated])

    expect(await service.update(existing.id, { name: "Renamed" })).toEqual(
      updated
    )
    const [update] = fake.calls("update")
    expect(update && stepArgs(update, "set")[0]).toEqual({
      name: "Renamed",
      nextRunAt: expect.any(Date),
    })
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  test("update rejects an invalid expression before writing", async () => {
    fake.queue("query.cronJob.findFirst", cronJobRow())

    await expect(
      service.update("job-1", { cronExpression: "nope" })
    ).rejects.toThrow(CronValidationError)
    expect(fake.calls("update")).toEqual([])
  })

  test("remove soft-deletes the job", async () => {
    fake.queue("query.cronJob.findFirst", cronJobRow())
    fake.queue("update", [])

    await service.remove("job-1")

    const [update] = fake.calls("update")
    expect(update && stepArgs(update, "set")[0]).toEqual({
      deletedAt: expect.any(Date),
      enabled: false,
      nextRunAt: null,
    })
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  test.each([
    ["update", () => service.update(codeJob.id, { name: "x" })],
    ["setEnabled", () => service.setEnabled(codeJob.id, false)],
    ["remove", () => service.remove(codeJob.id)],
    ["runNow", () => service.runNow(codeJob.id)],
  ])("%s rejects a code-declared job without writing", async (_, run) => {
    fake.queue("query.cronJob.findFirst", codeJob)

    await expect(run()).rejects.toThrow(CronReadOnlyError)
    expect(fake.calls("update")).toEqual([])
    expect(triggerRun).not.toHaveBeenCalled()
    expect(onChange).not.toHaveBeenCalled()
  })

  test("runNow hands a manual job to the scheduler", async () => {
    fake.queue("query.cronJob.findFirst", cronJobRow())

    expect(await service.runNow("job-1")).toEqual(
      cronRunRow({ jobId: "job-1" })
    )
    expect(triggerRun).toHaveBeenCalledWith("job-1")
  })
})
