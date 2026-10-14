import { beforeEach, describe, expect, test } from "bun:test"
import { cronJob, cronRun } from "@nonete/db/schema/cron"
import {
  createFakeDb,
  cronJobRow,
  cronRunRow,
  stepArgs,
} from "@nonete/db/testing"
import { desc, eq } from "drizzle-orm"

const fake = createFakeDb()

beforeEach(() => fake.reset())

describe("fake db", () => {
  test("resolves queued results in order, per operation", async () => {
    const first = cronJobRow({ id: "a" })
    const second = cronJobRow({ id: "b" })
    fake.queue("query.cronJob.findFirst", first, second)
    fake.queue("select", [])

    expect(
      await fake.db.query.cronJob.findFirst({ where: { id: "a" } })
    ).toEqual(first)
    expect(await fake.db.select().from(cronRun)).toEqual([])
    expect(
      await fake.db.query.cronJob.findFirst({ where: { id: "b" } })
    ).toEqual(second)
  })

  test("records every awaited chain with its steps", async () => {
    fake.queue("update", [])
    await fake.db
      .update(cronJob)
      .set({ enabled: false })
      .where(eq(cronJob.id, "a"))

    const [call] = fake.calls("update")
    expect(call?.steps.map((step) => step.method)).toEqual([
      "update",
      "set",
      "where",
    ])
    if (call) expect(stepArgs(call, "set")).toEqual([{ enabled: false }])
    expect(fake.calls("insert")).toEqual([])
  })

  test("rejects a chain with nothing queued, naming the operation", async () => {
    await expect(
      Promise.resolve(fake.db.query.cronRun.findMany())
    ).rejects.toThrow('no result queued for "query.cronRun.findMany"')
  })

  test("runs a transaction against the fake and records it first", async () => {
    fake.queue("delete", undefined)
    fake.queue("insert", [cronRunRow()])

    const result = await fake.db.transaction(async (tx) => {
      await tx.delete(cronRun).where(eq(cronRun.jobId, "a"))
      return tx
        .insert(cronRun)
        .values({ jobId: "a", handlerKey: "k", status: "running" })
        .returning()
    })

    expect(result).toEqual([cronRunRow()])
    expect(fake.calls().map((call) => call.op)).toEqual([
      "transaction",
      "delete",
      "insert",
    ])
  })

  test("accepts $dynamic queries and conflict clauses as chain steps", async () => {
    fake.queue("select", [cronJobRow()])
    fake.queue("insert", [])

    const query = fake.db.select().from(cronJob).$dynamic()
    await query
      .where(eq(cronJob.enabled, true))
      .orderBy(desc(cronJob.id))
      .limit(2)
    await fake.db
      .insert(cronJob)
      .values(cronJobRow())
      .onConflictDoNothing()
      .returning()

    const [select] = fake.calls("select")
    expect(select?.steps.map((step) => step.method)).toEqual([
      "select",
      "from",
      "$dynamic",
      "where",
      "orderBy",
      "limit",
    ])
    const [insert] = fake.calls("insert")
    expect(insert?.steps.map((step) => step.method)).toEqual([
      "insert",
      "values",
      "onConflictDoNothing",
      "returning",
    ])
  })
})
