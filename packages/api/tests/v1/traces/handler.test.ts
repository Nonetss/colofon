import { afterAll, beforeEach, describe, expect, spyOn, test } from "bun:test"
import { resetEnv, testEnv } from "#tests/fixtures/env"
import { expectErrorCode } from "#tests/fixtures/errors"
import { MAX_TRACE_SPANS, nameMatcher, tracesHandler } from "#v1/traces/handler"

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

/** The hint every search sends, so Tempo returns the newest matches. */
const NEWEST = "with (most_recent=true)"

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
      nextCursor: null,
    })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  test("searches every trace of the last 24 hours without filters", async () => {
    fetchSpy.mockResolvedValue(searchResponse([]))
    const before = Math.floor(Date.now() / 1000)

    await tracesHandler.search({ input: searchInput({ limit: 20 }) })

    const url = requestedUrl()
    expect(url.origin + url.pathname).toBe(`${TEMPO_URL}/api/search`)
    expect(url.searchParams.get("q")).toBe(`{ } ${NEWEST}`)
    // One past the page, to know whether another follows.
    expect(url.searchParams.get("limit")).toBe("21")
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
        name: "POST /rpc",
        from: "2026-10-14T00:00:00Z",
        to: "2026-10-14T01:00:00Z",
      }),
    })

    const url = requestedUrl()
    expect(url.searchParams.get("q")).toBe(
      `{ resource.service.name = "stack-backend" || span.db.system.name = "postgresql" } && { status = error } && { trace:duration >= 500ms } && { trace:rootName =~ "(?i).*POST /rpc.*" } ${NEWEST}`
    )
    expect(url.searchParams.get("start")).toBe(
      String(Date.parse("2026-10-14T00:00:00Z") / 1000)
    )
    expect(url.searchParams.get("end")).toBe(
      String(Date.parse("2026-10-14T01:00:00Z") / 1000)
    )
  })

  test("maps Tempo's traces newest first, restoring trimmed id zeros", async () => {
    const traces = [
      searchTrace("942dac5ae1610f0c180b4d39613cfc", 0),
      searchTrace(TRACE_ID, 60_000),
    ]
    // A fresh body per call: the database search finds both, the stream
    // search neither.
    fetchSpy
      .mockResolvedValueOnce(searchResponse(traces))
      .mockResolvedValueOnce(searchResponse(traces))
      .mockResolvedValueOnce(searchResponse([]))

    const result = await tracesHandler.search({ input: searchInput() })

    // The by-id searches name the ids normalized to 32 hex characters.
    expect(requestedUrl(1).searchParams.get("q")).toContain(
      'trace:id = "00942dac5ae1610f0c180b4d39613cfc"'
    )
    expect(result.nextCursor).toBeNull()
    expect(result.traces).toEqual([
      {
        traceId: TRACE_ID,
        rootService: "stack-backend",
        services: ["stack-frontend", "stack-backend", "postgresql"],
        rootName: "POST /rpc/*",
        startTime: "2026-10-14T10:42:01.249Z",
        durationMs: 7,
        errorCount: 2,
        streaming: false,
      },
      {
        traceId: "00942dac5ae1610f0c180b4d39613cfc",
        rootService: "stack-backend",
        services: ["stack-frontend", "stack-backend", "postgresql"],
        rootName: "POST /rpc/*",
        startTime: "2026-10-14T10:41:01.249Z",
        durationMs: 7,
        errorCount: 2,
        streaming: false,
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
      .mockResolvedValueOnce(searchResponse([]))

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

  test("flags as a stream only the traces the by-id stream search returns", async () => {
    const stream = "2".repeat(32)
    fetchSpy
      .mockResolvedValueOnce(
        searchResponse([searchTrace(stream, 60_000), searchTrace(TRACE_ID, 0)])
      )
      .mockResolvedValueOnce(searchResponse([]))
      .mockResolvedValueOnce(searchResponse([searchTrace(stream, 60_000)]))

    const result = await tracesHandler.search({ input: searchInput() })

    expect(
      result.traces.map((trace) => [trace.traceId, trace.streaming])
    ).toEqual([
      [stream, true],
      [TRACE_ID, false],
    ])
    expect(requestedUrl(2).searchParams.get("q")).toBe(
      `{ name = "consume_async_iterator_object_output" } && { trace:id = "${stream}" || trace:id = "${TRACE_ID}" }`
    )
    expect(fetchSpy).toHaveBeenCalledTimes(3)
  })

  test("makes no second search when nothing was found", async () => {
    fetchSpy.mockResolvedValue(searchResponse([]))

    await tracesHandler.search({ input: searchInput() })

    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  test("returns a page and a cursor at its oldest trace when more were found", async () => {
    const newest = "3".repeat(32)
    const middle = "2".repeat(32)
    const oldest = "1".repeat(32)
    fetchSpy
      .mockResolvedValueOnce(
        searchResponse([
          searchTrace(oldest, 0),
          searchTrace(newest, 2000),
          searchTrace(middle, 1000),
        ])
      )
      .mockResolvedValueOnce(searchResponse([]))
      .mockResolvedValueOnce(searchResponse([]))

    const result = await tracesHandler.search({
      input: searchInput({ limit: 2 }),
    })

    expect(result.traces.map((trace) => trace.traceId)).toEqual([
      newest,
      middle,
    ])
    expect(result.nextCursor).toBe(`${ns(1000)}-${middle}`)
    // The by-id searches only ask about the page.
    expect(requestedUrl(1).searchParams.get("q")).not.toContain(oldest)
  })

  test("a cursor ends the window on the second after it and drops what was shown", async () => {
    const cursorId = "5".repeat(32)
    const sameStartNewer = "6".repeat(32)
    const sameStartOlder = "4".repeat(32)
    const older = "1".repeat(32)
    fetchSpy
      .mockResolvedValueOnce(
        searchResponse([
          searchTrace("9".repeat(32), 1000.5),
          searchTrace(cursorId, 1000),
          searchTrace(sameStartNewer, 1000),
          searchTrace(older, 0),
          searchTrace(sameStartOlder, 1000),
        ])
      )
      .mockResolvedValueOnce(searchResponse([]))
      .mockResolvedValueOnce(searchResponse([]))

    const result = await tracesHandler.search({
      input: searchInput({ limit: 10, cursor: `${ns(1000)}-${cursorId}` }),
    })

    const url = requestedUrl()
    expect(url.searchParams.get("end")).toBe(
      String(BigInt(ns(1000)) / 1_000_000_000n + 1n)
    )
    // Room for the cursor's second, which comes back and is dropped.
    expect(url.searchParams.get("limit")).toBe("61")
    expect(result.traces.map((trace) => trace.traceId)).toEqual([
      sameStartOlder,
      older,
    ])
    expect(result.nextCursor).toBeNull()
  })

  test("keeps the cursor when the drop of its second leaves a cut-off page short", async () => {
    const cursorId = "5".repeat(32)
    const older = "1".repeat(32)
    const shown = Array.from({ length: 60 }, () => searchTrace(cursorId, 1000))
    fetchSpy
      .mockResolvedValueOnce(searchResponse([...shown, searchTrace(older, 0)]))
      .mockResolvedValueOnce(searchResponse([]))
      .mockResolvedValueOnce(searchResponse([]))

    const result = await tracesHandler.search({
      input: searchInput({ limit: 10, cursor: `${ns(1000)}-${cursorId}` }),
    })

    expect(result.traces.map((trace) => trace.traceId)).toEqual([older])
    expect(result.nextCursor).toBe(`${ns(0)}-${older}`)
  })

  test("skips the rest of a second holding more traces than a fetch brings", async () => {
    const cursorId = "5".repeat(32)
    const crowded = Array.from({ length: 52 }, () =>
      searchTrace("6".repeat(32), 1000)
    )
    fetchSpy.mockResolvedValueOnce(searchResponse(crowded))

    const result = await tracesHandler.search({
      input: searchInput({ limit: 1, cursor: `${ns(1000)}-${cursorId}` }),
    })

    const second = BigInt(ns(1000)) / 1_000_000_000n
    expect(result.traces).toEqual([])
    expect(result.nextCursor).toBe(
      `${second * 1_000_000_000n - 1n}-${"f".repeat(32)}`
    )
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  test("returns nothing without calling Tempo once the cursor passes the range", async () => {
    const result = await tracesHandler.search({
      input: searchInput({
        from: "2026-10-14T10:45:00Z",
        cursor: `${ns(0)}-${TRACE_ID}`,
      }),
    })

    expect(result).toEqual({ traces: [], nextCursor: null })
    expect(fetchSpy).not.toHaveBeenCalled()
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

describe("nameMatcher", () => {
  test("matches the text literally, whatever regex or quote it holds", () => {
    expect(nameMatcher(String.raw`a.b"c\(d)*`)).toBe(
      String.raw`"(?i).*a\\.b\"c\\\\\\(d\\)\\*.*"`
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
      bar: { offsetMs: 0, durationMs: 0.285, continues: false },
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

  test("keeps a child's bar inside its parent's, but not its measured times", async () => {
    fetchSpy.mockResolvedValue(
      traceResponse({
        "stack-backend": [
          { id: 1, name: "handler", startMs: 0, durationMs: 6.5 },
          // Starts at 6.0 (start times are whole milliseconds) and measures
          // 0.9 ms, so it ends 0.4 ms past its parent.
          {
            id: 2,
            parent: 1,
            name: "db findOne user",
            startMs: 6,
            durationMs: 0.9,
          },
          // Entirely after its parent ended.
          { id: 3, parent: 1, name: "late", startMs: 7, durationMs: 1 },
        ],
      })
    )

    const trace = await tracesHandler.get({ input: { traceId: TRACE_ID } })
    const [, child, late] = trace.spans

    expect(trace.scaleMs).toBe(trace.durationMs)
    expect(trace.streaming).toBe(false)
    expect(child).toMatchObject({
      offsetMs: 6,
      durationMs: 0.9,
      bar: { offsetMs: 6, durationMs: 0.5, continues: false },
    })
    expect(late?.bar).toEqual({
      offsetMs: 6.5,
      durationMs: 0,
      continues: false,
    })
  })

  test("scales a stream to its request and marks the stream span as continuing", async () => {
    fetchSpy.mockResolvedValue(
      traceResponse({
        "stack-backend": [
          {
            id: 1,
            name: "QUERY /rpc/v1/cron/watchRuns",
            startMs: 0,
            durationMs: 4,
          },
          {
            id: 2,
            parent: 1,
            name: "orpc.v1/cron/watchRuns",
            startMs: 2,
            durationMs: 270_000,
          },
          {
            id: 3,
            parent: 2,
            name: "consume_async_iterator_object_output",
            startMs: 3,
            durationMs: 269_999,
          },
        ],
      })
    )

    const trace = await tracesHandler.get({ input: { traceId: TRACE_ID } })

    expect(trace.streaming).toBe(true)
    expect(trace.scaleMs).toBe(4)
    expect(trace.durationMs).toBe(270_002)
    expect(trace.spans.map((span) => span.bar)).toEqual([
      { offsetMs: 0, durationMs: 4, continues: false },
      { offsetMs: 2, durationMs: 2, continues: true },
      { offsetMs: 3, durationMs: 1, continues: true },
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
