import { beforeEach, describe, expect, test } from "bun:test"
import { CronNotFoundError } from "@nonete/cron"
import { cronJobRow } from "@nonete/db/testing"
import { ORPCError } from "@orpc/server"
import { cronService, resetCronService } from "#tests/fixtures/cron-service"
import {
  closeCronEvents,
  publishCronJobsChange,
  publishCronRunChange,
} from "#v1/cron/events"
import { cronHandler } from "#v1/cron/handler"

const JOB = "job-a"
const OTHER_JOB = "job-b"
const MISSING_JOB = "job-missing"

beforeEach(() => {
  resetCronService()
  cronService.get.mockImplementation(async (id) => {
    if (id === MISSING_JOB) {
      throw new CronNotFoundError(`Cron job not found: ${id}`)
    }
    return cronJobRow({ id })
  })
})

function watch(jobId: string, signal?: AbortSignal) {
  return cronHandler.watchRuns({ input: { jobId }, signal })
}

describe("cron.watchRuns", () => {
  test("fails with NOT_FOUND for an unknown job", async () => {
    const error = await watch(MISSING_JOB)
      .next()
      .then(
        () => undefined,
        (thrown: unknown) => thrown
      )
    expect(error).toBeInstanceOf(ORPCError)
    if (error instanceof ORPCError) expect(error.code).toBe("NOT_FOUND")
  })

  test("sends subscribed first, then only the job's own run changes", async () => {
    const controller = new AbortController()
    const events = watch(JOB, controller.signal)

    expect((await events.next()).value).toEqual({ type: "subscribed" })

    await publishCronRunChange({
      jobId: OTHER_JOB,
      runId: "run-other",
      status: "running",
    })
    await publishCronRunChange({
      jobId: JOB,
      runId: "run-1",
      status: "running",
    })
    await publishCronRunChange({
      jobId: JOB,
      runId: "run-1",
      status: "success",
    })

    expect((await events.next()).value).toEqual({
      type: "run",
      runId: "run-1",
      status: "running",
    })
    expect((await events.next()).value).toEqual({
      type: "run",
      runId: "run-1",
      status: "success",
    })

    controller.abort()
    expect((await events.next()).done).toBe(true)
  })
})

describe("cron.watchJobs", () => {
  test("sends subscribed first, then changed for a run change and a job change", async () => {
    const controller = new AbortController()
    const events = cronHandler.watchJobs({ signal: controller.signal })

    expect((await events.next()).value).toEqual({ type: "subscribed" })

    await publishCronRunChange({
      jobId: OTHER_JOB,
      runId: "run-other",
      status: "running",
    })
    await publishCronJobsChange()

    expect((await events.next()).value).toEqual({ type: "changed" })
    expect((await events.next()).value).toEqual({ type: "changed" })

    controller.abort()
    expect((await events.next()).done).toBe(true)
  })

  test("an idle list sends nothing after subscribed", async () => {
    const controller = new AbortController()
    const events = cronHandler.watchJobs({ signal: controller.signal })
    expect((await events.next()).value).toEqual({ type: "subscribed" })

    const next = events.next()
    const idle = await Promise.race([
      next.then(() => "event"),
      new Promise((resolve) => setTimeout(() => resolve("idle"), 10)),
    ])

    expect(idle).toBe("idle")
    controller.abort()
    expect((await next).done).toBe(true)
  })
})

describe("cron event streams on shutdown", () => {
  // Last on purpose: the shutdown signal stays aborted for the whole process.
  test("end when the backend shuts down", async () => {
    const runs = watch(JOB)
    const jobs = cronHandler.watchJobs({})
    expect((await runs.next()).value).toEqual({ type: "subscribed" })
    expect((await jobs.next()).value).toEqual({ type: "subscribed" })

    const nextRun = runs.next()
    const nextJobs = jobs.next()
    closeCronEvents()
    expect((await nextRun).done).toBe(true)
    expect((await nextJobs).done).toBe(true)

    expect((await watch(JOB).next()).done).toBe(true)
    expect((await cronHandler.watchJobs({}).next()).done).toBe(true)
  })
})
