import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  spyOn,
  test,
} from "bun:test"
import { SpanStatusCode, withSpan } from "@nonete/telemetry/span"
import { startTestTracing, type TestTracing } from "@nonete/telemetry/testing"
import pg from "pg"

import { pgTracing } from "#tracing"

const EMAIL = "secret@example.com"
const QUERY = 'select "id" from "user" where "email" = $1'

let tracing: TestTracing
let instrumentation: ReturnType<typeof pgTracing>
let querySpy: ReturnType<typeof spyOn>

/** A client that never connects: `query` is stubbed under the patch. */
function client() {
  return new pg.Client({
    host: "db.test",
    port: 5432,
    database: "stack",
    user: "postgres",
  })
}

function result(rowCount: number) {
  return { command: "SELECT", rowCount, oid: 0, fields: [], rows: [] }
}

beforeAll(() => {
  tracing = startTestTracing()
})

afterAll(() => tracing.shutdown())

beforeEach(() => {
  tracing.reset()
  // Stubbed before the patch, so the instrumentation wraps the stub the
  // way it wraps the real `query` in production.
  querySpy = spyOn(pg.Client.prototype, "query").mockImplementation(() =>
    Promise.resolve(result(2))
  )
  instrumentation = pgTracing()
  instrumentation.enable()
})

afterEach(() => {
  instrumentation.disable()
  querySpy.mockRestore()
})

describe("pgTracing", () => {
  test("records a CLIENT span per query inside a trace, with the query text", async () => {
    await withSpan("test", "POST /rpc/v1/cron/list", {}, () =>
      client().query({ text: QUERY }, [EMAIL])
    )

    const span = await tracing.waitForSpan("pg.query:SELECT stack")
    expect(span.attributes).toMatchObject({
      "db.system.name": "postgresql",
      "db.namespace": "stack",
      "db.query.text": QUERY,
    })
    expect(span.parentSpanContext).toBeDefined()
  })

  test("never records the parameter values", async () => {
    await withSpan("test", "request", {}, () =>
      client().query({ text: QUERY }, [EMAIL])
    )

    const span = await tracing.waitForSpan("pg.query:SELECT stack")
    expect(JSON.stringify(span.attributes)).not.toContain(EMAIL)
  })

  test("a failed query fails its span and still rejects with the original error", async () => {
    const error = new Error("duplicate key value")
    querySpy.mockImplementation(() => Promise.reject(error))

    await expect(
      withSpan("test", "request", {}, () =>
        client().query({ text: 'insert into "user" values ($1)' }, [EMAIL])
      )
    ).rejects.toBe(error)

    const span = await tracing.waitForSpan("pg.query:INSERT stack")
    expect(span.status.code).toBe(SpanStatusCode.ERROR)
  })

  test("queries outside a trace get no span and return their result unchanged", async () => {
    expect(await client().query({ text: QUERY }, [EMAIL])).toEqual(result(2))
    expect(tracing.spans()).toEqual([])
  })

  test("disable restores the unpatched query", async () => {
    instrumentation.disable()

    await withSpan("test", "request", {}, () => client().query({ text: QUERY }))

    expect(tracing.spans().map((span) => span.name)).toEqual(["request"])
  })
})
