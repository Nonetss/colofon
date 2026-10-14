import { afterAll, beforeEach, describe, expect, spyOn, test } from "bun:test"
import { resetEnv, testEnv } from "#tests/fixtures/env"
import { expectErrorCode } from "#tests/fixtures/errors"
import { MAX_TRACE_SPANS, tracesHandler } from "#v1/traces/handler"

const TEMPO_URL = "http://tempo.test:3200"
const TRACE_ID = "25942dac5ae1610f0c180b4d39613cfc"
/** 2026-10-14T10:41:01.249Z in nanoseconds. */
const T0 = 1_791_974_461_249_000_000n

type SearchInput = Parameters<typeof tracesHandler.search>[0]["input"]

const fetchSpy = spyOn(globalThis, "fetch")

function searchInput(overrides: Partial<SearchInput> = {}): SearchInput {
  return { limit: 50, ...overrides }
}

function requestedUrl(call = 0): URL {
  const [url] = fetchSpy.mock.calls[call] ?? []
  if (!(url instanceof URL)) throw new Error("fetch was not called with a URL")
  return url
}

/** Tempo's v2 JSON sends ids base64-encoded. */
function b64(hex: string): string {
  return Buffer.from(hex, "hex").toString("base64")
}

/** Span id `000…0<n>` (16 hex chars). */
function spanId(n: number): string {
  return n.toString(16).padStart(16, "0")
}

interface SpanSpec {
  id: number
  parent?: number
  name: string
  startMs: number
  durationMs: number
  kind?: string
  status?: { code?: string; message?: string }
  attributes?: { key: string; value: Record<string, unknown> }[]
  events?: { name: string; atMs: number }[]
}

function ns(ms: number): string {
  return (T0 + BigInt(Math.round(ms * 1_000_000))).toString()
}

/** Tempo leaves `parentSpanId` out for a root span. */
function parentOf(spec: SpanSpec): { parentSpanId?: string } {
  if (spec.parent === undefined) return {}
  return { parentSpanId: b64(spanId(spec.parent)) }
}

function otlpSpan(spec: SpanSpec) {
  return {
    traceId: b64(TRACE_ID),
    spanId: b64(spanId(spec.id)),
    ...parentOf(spec),
    name: spec.name,
    kind: spec.kind ?? "SPAN_KIND_INTERNAL",
    startTimeUnixNano: ns(spec.startMs),
    endTimeUnixNano: ns(spec.startMs + spec.durationMs),
    attributes: spec.attributes ?? [],
    events: (spec.events ?? []).map((event) => ({
      timeUnixNano: ns(event.atMs),
      name: event.name,
      attributes: [{ key: "size", value: { intValue: "3" } }],
    })),
    status: spec.status ?? {},
  }
}

function traceResponse(byService: Record<string, SpanSpec[]>) {
  return Response.json({
    trace: {
      resourceSpans: Object.entries(byService).map(([service, spans]) => ({
        resource: {
          attributes: [
            { key: "service.name", value: { stringValue: service } },
          ],
        },
        scopeSpans: [{ scope: { name: "test" }, spans: spans.map(otlpSpan) }],
      })),
    },
    metrics: {},
  })
}

function searchResponse(traces: Record<string, unknown>[]) {
  return Response.json({ traces, metrics: { completedJobs: 1, totalJobs: 1 } })
}

function searchTrace(traceID: string, startOffsetMs: number) {
  return {
    traceID,
    rootServiceName: "stack-backend",
    rootTraceName: "POST /rpc/*",
    startTimeUnixNano: ns(startOffsetMs),
    durationMs: 7,
    serviceStats: {
      "stack-backend": { spanCount: 4, errorCount: 2 },
      "stack-frontend": { spanCount: 1 },
    },
  }
}

beforeEach(() => {
  resetEnv()
  testEnv.TEMPO_URL = TEMPO_URL
  fetchSpy.mockReset()
})

afterAll(() => {
  fetchSpy.mockRestore()
})

describe("traces.search", () => {
  test("returns nothing without calling Tempo when TEMPO_URL is unset", async () => {
    testEnv.TEMPO_URL = undefined

    expect(await tracesHandler.search({ input: searchInput() })).toEqual({
      traces: [],
      limitReached: false,
    })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  test("searches every trace of the last 24 hours without filters", async () => {
    fetchSpy.mockResolvedValue(searchResponse([]))
    const before = Math.floor(Date.now() / 1000)

    await tracesHandler.search({ input: searchInput({ limit: 20 }) })

    const url = requestedUrl()
    expect(url.origin + url.pathname).toBe(`${TEMPO_URL}/api/search`)
    expect(url.searchParams.get("q")).toBe("{ }")
    expect(url.searchParams.get("limit")).toBe("20")
    const start = Number(url.searchParams.get("start"))
    const end = Number(url.searchParams.get("end"))
    expect(end - start).toBeGreaterThanOrEqual(24 * 60 * 60)
    expect(end).toBeGreaterThanOrEqual(before)
  })

  test("ANDs one spanset per filter, so each may match a different span", async () => {
    fetchSpy.mockResolvedValue(searchResponse([]))

    await tracesHandler.search({
      input: searchInput({
        services: ["stack-backend", "postgresql"],
        errorsOnly: true,
        minDurationMs: 500,
        name: "cron.list",
        from: "2026-10-14T00:00:00Z",
        to: "2026-10-14T01:00:00Z",
      }),
    })

    const url = requestedUrl()
    expect(url.searchParams.get("q")).toBe(
      '{ resource.service.name = "stack-backend" || span.db.system.name = "postgresql" } && { status = error } && { trace:duration >= 500ms } && { trace:rootName =~ "(?i).*cron\\\\.list.*" }'
    )
    expect(url.searchParams.get("start")).toBe(
      String(Date.parse("2026-10-14T00:00:00Z") / 1000)
    )
    expect(url.searchParams.get("end")).toBe(
      String(Date.parse("2026-10-14T01:00:00Z") / 1000)
    )
  })

  test("escapes quotes and braces in the name, so they match literally", async () => {
    fetchSpy.mockResolvedValue(searchResponse([]))

    await tracesHandler.search({ input: searchInput({ name: 'a"} || {b' }) })

    expect(requestedUrl().searchParams.get("q")).toBe(
      '{ trace:rootName =~ "(?i).*a\\"\\\\} \\\\|\\\\| \\\\{b.*" }'
    )
  })

  test("maps Tempo's traces newest first, restoring trimmed id zeros", async () => {
    const traces = [
      searchTrace("942dac5ae1610f0c180b4d39613cfc", 0),
      searchTrace(TRACE_ID, 60_000),
    ]
    // A fresh body per call: the second search finds both in the database.
    fetchSpy
      .mockResolvedValueOnce(searchResponse(traces))
      .mockResolvedValueOnce(searchResponse(traces))

    const result = await tracesHandler.search({ input: searchInput() })

    expect(result.limitReached).toBe(false)
    expect(result.traces).toEqual([
      {
        traceId: TRACE_ID,
        rootService: "stack-backend",
        services: ["stack-frontend", "stack-backend", "postgresql"],
        rootName: "POST /rpc/*",
        startTime: "2026-10-14T10:42:01.249Z",
        durationMs: 7,
        errorCount: 2,
      },
      {
        traceId: "00942dac5ae1610f0c180b4d39613cfc",
        rootService: "stack-backend",
        services: ["stack-frontend", "stack-backend", "postgresql"],
        rootName: "POST /rpc/*",
        startTime: "2026-10-14T10:41:01.249Z",
        durationMs: 7,
        errorCount: 2,
      },
    ])
  })

  test("adds PostgreSQL only to the found traces a second search by id says queried it", async () => {
    const other = "1".repeat(32)
    fetchSpy
      .mockResolvedValueOnce(
        searchResponse([searchTrace(TRACE_ID, 60_000), searchTrace(other, 0)])
      )
      .mockResolvedValueOnce(searchResponse([searchTrace(TRACE_ID, 60_000)]))

    const result = await tracesHandler.search({
      input: searchInput({ errorsOnly: true }),
    })

    expect(
      result.traces.map((trace) => [trace.traceId, trace.services])
    ).toEqual([
      [TRACE_ID, ["stack-frontend", "stack-backend", "postgresql"]],
      [other, ["stack-frontend", "stack-backend"]],
    ])
    // Named by id: Tempo's search returns the first matches it finds, so
    // re-running the filters could answer about other traces.
    const second = requestedUrl(1)
    expect(second.searchParams.get("q")).toBe(
      `{ span.db.system.name = "postgresql" } && { trace:id = "${TRACE_ID}" || trace:id = "${other}" }`
    )
    expect(second.searchParams.get("limit")).toBe("2")
  })

  test("makes no second search when nothing was found", async () => {
    fetchSpy.mockResolvedValue(searchResponse([]))

    await tracesHandler.search({ input: searchInput() })

    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  test("flags when the limit was reached", async () => {
    const traces = [searchTrace(TRACE_ID, 0), searchTrace(TRACE_ID, 1)]
    fetchSpy
      .mockResolvedValueOnce(searchResponse(traces))
      .mockResolvedValueOnce(searchResponse([]))

    const result = await tracesHandler.search({
      input: searchInput({ limit: 2 }),
    })

    expect(result.limitReached).toBe(true)
  })

  test("is BAD_GATEWAY when Tempo is unreachable", async () => {
    fetchSpy.mockRejectedValue(new TypeError("fetch failed"))

    await expectErrorCode(
      tracesHandler.search({ input: searchInput() }),
      "BAD_GATEWAY"
    )
  })

  test("is BAD_GATEWAY when Tempo answers an error status", async () => {
    fetchSpy.mockResolvedValue(new Response("boom", { status: 500 }))

    await expectErrorCode(
      tracesHandler.search({ input: searchInput() }),
      "BAD_GATEWAY"
    )
  })

  test("is BAD_GATEWAY when Tempo's body isn't a search response", async () => {
    fetchSpy.mockResolvedValue(Response.json({ traces: [{ id: 1 }] }))

    await expectErrorCode(
      tracesHandler.search({ input: searchInput() }),
      "BAD_GATEWAY"
    )
  })
})

describe("traces.get", () => {
  test("is SERVICE_UNAVAILABLE without calling Tempo when TEMPO_URL is unset", async () => {
    testEnv.TEMPO_URL = undefined

    await expectErrorCode(
      tracesHandler.get({ input: { traceId: TRACE_ID } }),
      "SERVICE_UNAVAILABLE"
    )
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  test("is NOT_FOUND for Tempo's empty answer to an unknown id", async () => {
    fetchSpy.mockResolvedValue(Response.json({ trace: {}, metrics: {} }))

    await expectErrorCode(
      tracesHandler.get({ input: { traceId: TRACE_ID } }),
      "NOT_FOUND"
    )
    expect(requestedUrl().pathname).toBe(`/api/v2/traces/${TRACE_ID}`)
  })

  test("is NOT_FOUND for a 404", async () => {
    fetchSpy.mockResolvedValue(new Response("not found", { status: 404 }))

    await expectErrorCode(
      tracesHandler.get({ input: { traceId: TRACE_ID } }),
      "NOT_FOUND"
    )
  })

  test("is BAD_GATEWAY when Tempo answers an error status", async () => {
    fetchSpy.mockResolvedValue(new Response("boom", { status: 503 }))

    await expectErrorCode(
      tracesHandler.get({ input: { traceId: TRACE_ID } }),
      "BAD_GATEWAY"
    )
  })

  test("lays the spans out depth-first, siblings by start, across services", async () => {
    fetchSpy.mockResolvedValue(
      traceResponse({
        "stack-backend": [
          { id: 4, parent: 2, name: "INSERT", startMs: 7, durationMs: 1 },
          {
            id: 2,
            parent: 1,
            name: "call_procedure",
            startMs: 2,
            durationMs: 8,
          },
          { id: 3, parent: 2, name: "SELECT", startMs: 3, durationMs: 2 },
        ],
        "stack-frontend": [
          { id: 1, name: "GET /crons", startMs: 0, durationMs: 12 },
        ],
      })
    )

    const trace = await tracesHandler.get({ input: { traceId: TRACE_ID } })

    expect(
      trace.spans.map((span) => [
        span.name,
        span.service,
        span.depth,
        span.parentSpanId,
        span.offsetMs,
        span.durationMs,
      ])
    ).toEqual([
      ["GET /crons", "stack-frontend", 0, null, 0, 12],
      ["call_procedure", "stack-backend", 1, spanId(1), 2, 8],
      ["SELECT", "stack-backend", 2, spanId(2), 3, 2],
      ["INSERT", "stack-backend", 2, spanId(2), 7, 1],
    ])
    expect(trace).toMatchObject({
      traceId: TRACE_ID,
      startTime: "2026-10-14T10:41:01.249Z",
      durationMs: 12,
      spanCount: 4,
      errorCount: 0,
      truncated: false,
    })
  })

  test("places a span whose parent is missing as a root", async () => {
    fetchSpy.mockResolvedValue(
      traceResponse({
        "stack-backend": [
          { id: 1, name: "POST /rpc/*", startMs: 0, durationMs: 5 },
          { id: 3, parent: 99, name: "orphan", startMs: 1, durationMs: 1 },
        ],
      })
    )

    const trace = await tracesHandler.get({ input: { traceId: TRACE_ID } })

    expect(
      trace.spans.map((span) => [span.name, span.depth, span.parentSpanId])
    ).toEqual([
      ["POST /rpc/*", 0, null],
      ["orphan", 0, null],
    ])
  })

  test("maps kind, status, attributes and events", async () => {
    fetchSpy.mockResolvedValue(
      traceResponse({
        "stack-backend": [
          {
            id: 1,
            name: "INSERT",
            startMs: 0,
            durationMs: 0.285,
            kind: "SPAN_KIND_CLIENT",
            status: { code: "STATUS_CODE_ERROR", message: "duplicate key" },
            attributes: [
              { key: "db.query.text", value: { stringValue: "insert $1" } },
              { key: "db.response.returned_rows", value: { intValue: "2" } },
              { key: "x.flag", value: { boolValue: true } },
              { key: "x.ratio", value: { doubleValue: 0.5 } },
              {
                key: "rpc.path",
                value: {
                  arrayValue: {
                    values: [{ stringValue: "v1" }, { stringValue: "cron" }],
                  },
                },
              },
            ],
            events: [{ name: "exception", atMs: 0.25 }],
          },
        ],
      })
    )

    const trace = await tracesHandler.get({ input: { traceId: TRACE_ID } })

    expect(trace.errorCount).toBe(1)
    expect(trace.spans[0]).toEqual({
      spanId: spanId(1),
      parentSpanId: null,
      name: "INSERT",
      service: "stack-backend",
      kind: "client",
      depth: 0,
      offsetMs: 0,
      durationMs: 0.285,
      status: "error",
      statusMessage: "duplicate key",
      attributes: {
        "db.query.text": "insert $1",
        "db.response.returned_rows": 2,
        "x.flag": true,
        "x.ratio": 0.5,
        "rpc.path": ["v1", "cron"],
      },
      events: [{ name: "exception", offsetMs: 0.25, attributes: { size: 3 } }],
    })
  })

  test("shows a query span under its database system, not the emitting service", async () => {
    fetchSpy.mockResolvedValue(
      traceResponse({
        "stack-backend": [
          { id: 1, name: "POST /rpc/v1/cron/list", startMs: 0, durationMs: 5 },
          {
            id: 2,
            parent: 1,
            name: "pg.query:SELECT stack",
            startMs: 1,
            durationMs: 2,
            kind: "SPAN_KIND_CLIENT",
            attributes: [
              { key: "db.system.name", value: { stringValue: "postgresql" } },
            ],
          },
        ],
      })
    )

    const trace = await tracesHandler.get({ input: { traceId: TRACE_ID } })

    expect(trace.spans.map((span) => [span.name, span.service])).toEqual([
      ["POST /rpc/v1/cron/list", "stack-backend"],
      ["pg.query:SELECT stack", "postgresql"],
    ])
  })

  test(`cuts a trace past ${MAX_TRACE_SPANS} spans and flags it`, async () => {
    const spans: SpanSpec[] = [
      { id: 1, name: "cron.run", startMs: 0, durationMs: 5000 },
    ]
    for (let i = 0; i < MAX_TRACE_SPANS + 5; i++) {
      spans.push({
        id: i + 2,
        parent: 1,
        name: "SELECT",
        startMs: 1 + i / 1000,
        durationMs: 0.5,
      })
    }
    fetchSpy.mockResolvedValue(traceResponse({ "stack-backend": spans }))

    const trace = await tracesHandler.get({ input: { traceId: TRACE_ID } })

    expect(trace.spans).toHaveLength(MAX_TRACE_SPANS)
    expect(trace.spans[0]?.name).toBe("cron.run")
    expect(trace.spanCount).toBe(MAX_TRACE_SPANS + 6)
    expect(trace.truncated).toBe(true)
  })
})
