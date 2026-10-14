import { describe, expect, test } from "bun:test"
import { markedTracesQuery, traceSearchQuery } from "#v1/traces/traceql"

const NEWEST = "with (most_recent=true)"
const TRACE_ID = "25942dac5ae1610f0c180b4d39613cfc"
const OTHER_ID = "1".repeat(32)

describe("traceSearchQuery", () => {
  test("matches every trace without filters", () => {
    expect(traceSearchQuery({})).toBe(`{ } ${NEWEST}`)
    expect(traceSearchQuery({ services: [] })).toBe(`{ } ${NEWEST}`)
  })

  test("ORs the services inside one spanset", () => {
    expect(traceSearchQuery({ services: ["frontend", "postgresql"] })).toBe(
      `{ resource.service.name = "frontend" || span.db.system.name = "postgresql" } ${NEWEST}`
    )
  })

  test("ANDs one spanset per filter, so each may match a different span", () => {
    expect(
      traceSearchQuery({
        services: ["backend"],
        errorsOnly: true,
        minDurationMs: 500,
        name: "POST /rpc",
      })
    ).toBe(
      `{ resource.service.name = "backend" } && { status = error } && { trace:duration >= 500ms } && { trace:rootName =~ "(?i).*POST /rpc.*" } ${NEWEST}`
    )
  })

  test("leaves errors out when errorsOnly is false", () => {
    expect(traceSearchQuery({ errorsOnly: false })).toBe(`{ } ${NEWEST}`)
  })

  test("matches the name literally, whatever regex or quote it holds", () => {
    expect(traceSearchQuery({ name: String.raw`a.b"c\(d)*` })).toBe(
      String.raw`{ trace:rootName =~ "(?i).*a\\.b\"c\\\\\\(d\\)\\*.*" } ` +
        NEWEST
    )
  })

  test("refuses a name with control characters", () => {
    expect(() => traceSearchQuery({ name: 'a"\n} || { true' })).toThrow()
  })

  test("refuses a duration that isn't whole non-negative milliseconds", () => {
    expect(() => traceSearchQuery({ minDurationMs: 1.5 })).toThrow()
    expect(() => traceSearchQuery({ minDurationMs: -1 })).toThrow()
  })
})

describe("markedTracesQuery", () => {
  test("names the traces that queried the database by id", () => {
    expect(markedTracesQuery("database", [TRACE_ID, OTHER_ID])).toBe(
      `{ span.db.system.name = "postgresql" } && { trace:id = "${TRACE_ID}" || trace:id = "${OTHER_ID}" }`
    )
  })

  test("names the streams by oRPC's stream span", () => {
    expect(markedTracesQuery("stream", [TRACE_ID])).toBe(
      `{ name = "consume_async_iterator_object_output" } && { trace:id = "${TRACE_ID}" }`
    )
  })

  test("refuses no ids, which would match every trace", () => {
    expect(() => markedTracesQuery("stream", [])).toThrow()
  })

  test("refuses an id that isn't 32 lowercase hex characters", () => {
    expect(() => markedTracesQuery("stream", ['" } || { true'])).toThrow()
    expect(() => markedTracesQuery("stream", ["942dac"])).toThrow()
  })
})
