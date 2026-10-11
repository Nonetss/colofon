import { beforeEach, describe, expect, test } from "bun:test"
import {
  CronNotFoundError,
  CronReadOnlyError,
  CronValidationError,
} from "@nonete/cron"
import { cronJobRow, cronRunRow } from "@nonete/db/testing"

import { sortedCursor } from "#shared/pagination"
import { adminContext } from "#tests/fixtures/context"
import { cronService, resetCronService } from "#tests/fixtures/cron-service"
import { expectErrorCode } from "#tests/fixtures/errors"
import { cronHandler } from "#v1/cron/handler"
import { cronInput } from "#v1/cron/input"

const JOB_ID = "00000000-0000-4000-8000-000000000001"

const createInput = {
  name: "Nightly cleanup",
  cronExpression: "0 3 * * *",
  handlerKey: "v1.maintenance.cleanup",
  enabled: true,
}

beforeEach(() => resetCronService())

describe("cron error mapping", () => {
  test.each([
    [new CronNotFoundError("missing"), "NOT_FOUND"],
    [new CronReadOnlyError("code job"), "CONFLICT"],
    [new CronValidationError("bad expression"), "BAD_REQUEST"],
  ])("maps %p to %s", async (error, code) => {
    cronService.update.mockRejectedValue(error)
    await expectErrorCode(
      cronHandler.update({ input: { id: JOB_ID, name: "Renamed" } }),
      code
    )
  })

  test("lets unknown errors through unchanged", async () => {
    const boom = new Error("boom")
    cronService.remove.mockRejectedValue(boom)
    expect(cronHandler.remove({ input: { id: JOB_ID } })).rejects.toBe(boom)
  })
})

describe("cron.create", () => {
  test("binds the job to the caller when userId is omitted", async () => {
    cronService.create.mockResolvedValue(cronJobRow())

    await cronHandler.create({ context: adminContext(), input: createInput })

    expect(cronService.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "admin-id", timezone: "UTC" })
    )
  })

  test("runs the job with no user when userId is null", async () => {
    cronService.create.mockResolvedValue(cronJobRow())

    await cronHandler.create({
      context: adminContext(),
      input: { ...createInput, userId: null },
    })

    expect(cronService.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: null })
    )
  })

  test("serializes the stored job", async () => {
    cronService.create.mockResolvedValue(
      cronJobRow({ nextRunAt: new Date("2026-01-02T03:00:00.000Z") })
    )

    const job = await cronHandler.create({
      context: adminContext(),
      input: createInput,
    })

    expect(job).toMatchObject({
      id: "job-1",
      nextRunAt: "2026-01-02T03:00:00.000Z",
      lastRunAt: null,
      payload: null,
      createdAt: "2026-01-01T00:00:00.000Z",
    })
  })
})

describe("cron.listRuns", () => {
  function listedRun(id: string, startedAt: string, sortValue: string | null) {
    return {
      ...cronRunRow({ id, startedAt: new Date(startedAt) }),
      sortValue,
      cursorStartedAt: startedAt.replace("T", " ").replace(".000Z", ""),
    }
  }

  const runs = [
    listedRun("run-3", "2026-01-03T00:00:00.000Z", "2026-01-03 00:00:00"),
    listedRun("run-2", "2026-01-02T00:00:00.000Z", "2026-01-02 00:00:00"),
    listedRun("run-1", "2026-01-01T00:00:00.000Z", "2026-01-01 00:00:00"),
  ]

  const base = {
    jobId: JOB_ID,
    limit: 2,
    sort: "startedAt",
    order: "desc",
  } as const

  test("over-fetches by one and returns a sorted cursor to the last row", async () => {
    cronService.listRuns.mockResolvedValue(runs)

    const page = await cronHandler.listRuns({ input: base })

    expect(cronService.listRuns).toHaveBeenCalledWith({
      jobId: JOB_ID,
      statuses: undefined,
      sort: "startedAt",
      order: "desc",
      limit: 3,
      cursor: undefined,
    })
    expect(page.runs.map((run) => run.id)).toEqual(["run-3", "run-2"])
    expect(page.nextCursor).toBe(
      sortedCursor.encode({
        k: "startedAt",
        o: "desc",
        p: "2026-01-02 00:00:00",
        t: ["2026-01-02 00:00:00", "run-2"],
      })
    )
  })

  test("passes the sort, the statuses and the cursor through", async () => {
    cronService.listRuns.mockResolvedValue(runs.slice(2))
    const cursor = {
      k: "duration",
      o: "asc" as const,
      p: null,
      t: ["2026-01-02 00:00:00", "run-2"],
    }

    const page = await cronHandler.listRuns({
      input: {
        ...base,
        sort: "duration",
        order: "asc",
        statuses: ["failed", "skipped"],
        cursor,
      },
    })

    expect(cronService.listRuns).toHaveBeenCalledWith({
      jobId: JOB_ID,
      statuses: ["failed", "skipped"],
      sort: "duration",
      order: "asc",
      limit: 3,
      cursor,
    })
    expect(page.nextCursor).toBeNull()
  })

  test("sorts by status with its rank as the cursor key", async () => {
    cronService.listRuns.mockResolvedValue([
      listedRun("run-3", "2026-01-03T00:00:00.000Z", "1"),
      listedRun("run-2", "2026-01-02T00:00:00.000Z", "1"),
      listedRun("run-1", "2026-01-01T00:00:00.000Z", "3"),
    ])

    const page = await cronHandler.listRuns({
      input: { ...base, sort: "status", order: "asc" },
    })

    expect(page.nextCursor).toBe(
      sortedCursor.encode({
        k: "status",
        o: "asc",
        p: "1",
        t: ["2026-01-02 00:00:00", "run-2"],
      })
    )
  })

  test("a cursor issued for another sort or order is BAD_REQUEST before any read", async () => {
    const cursor = { k: "startedAt", o: "desc" as const, p: "x", t: ["x", "y"] }

    await expectErrorCode(
      cronHandler.listRuns({ input: { ...base, sort: "status", cursor } }),
      "BAD_REQUEST"
    )
    await expectErrorCode(
      cronHandler.listRuns({ input: { ...base, order: "asc", cursor } }),
      "BAD_REQUEST"
    )
    expect(cronService.listRuns).not.toHaveBeenCalled()
  })

  test("defaults to every status, newest first by start time", () => {
    const parsed = cronInput.listRuns.parse({ jobId: JOB_ID })
    expect(parsed.sort).toBe("startedAt")
    expect(parsed.order).toBe("desc")
    expect(parsed.statuses).toBeUndefined()
  })

  test("rejects an unknown sort key", () => {
    expect(
      cronInput.listRuns.safeParse({ jobId: JOB_ID, sort: "handler" }).success
    ).toBe(false)
  })
})
