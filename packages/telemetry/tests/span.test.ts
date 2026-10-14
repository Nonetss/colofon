import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test"
import { SpanKind, SpanStatusCode } from "@opentelemetry/api"

import {
  activeTraceFields,
  injectTraceHeaders,
  linksToActiveSpan,
  withoutTracing,
  withServerSpan,
  withSpan,
} from "#span"
import { startTestTracing, type TestTracing } from "#testing"

const TRACER = "test"
const REMOTE_TRACE_ID = "4bf92f3577b34da6a3ce929d0e0e4736"
const REMOTE_SPAN_ID = "00f067aa0ba902b7"

let tracing: TestTracing

beforeAll(() => {
  tracing = startTestTracing()
})

afterAll(() => tracing.shutdown())

beforeEach(() => tracing.reset())

function onlySpan() {
  const spans = tracing.spans()
  expect(spans).toHaveLength(1)
  const [span] = spans
  if (span === undefined) throw new Error("expected one span")
  return span
}

function spanNamed(name: string) {
  const span = tracing.spans().find((candidate) => candidate.name === name)
  if (span === undefined) throw new Error(`no span named ${name}`)
  return span
}

function request(headers: Record<string, string> = {}) {
  return new Request("https://example.test/rpc/v1/cron/list?x=1", {
    method: "POST",
    headers,
  })
}

function traceparent(flags: string) {
  return `00-${REMOTE_TRACE_ID}-${REMOTE_SPAN_ID}-${flags}`
}

describe("withSpan", () => {
  test("returns the result and ends the span without an error status", async () => {
    const result = await withSpan(TRACER, "work", {}, () => 42)

    expect(result).toBe(42)
    const span = onlySpan()
    expect(span.name).toBe("work")
    expect(span.ended).toBe(true)
    expect(span.status.code).toBe(SpanStatusCode.UNSET)
  })

  test("rethrows the original error after recording it and failing the span", async () => {
    const error = new Error("boom")

    await expect(
      withSpan(TRACER, "work", {}, async () => {
        throw error
      })
    ).rejects.toBe(error)

    const span = onlySpan()
    expect(span.ended).toBe(true)
    expect(span.status).toEqual({ code: SpanStatusCode.ERROR, message: "boom" })
    expect(span.events.map((event) => event.name)).toEqual(["exception"])
  })

  test("nests under the active span", async () => {
    await withSpan(TRACER, "parent", {}, () =>
      withSpan(TRACER, "child", {}, () => undefined)
    )

    const parent = spanNamed("parent")
    const child = spanNamed("child")
    expect(child.spanContext().traceId).toBe(parent.spanContext().traceId)
    expect(child.parentSpanContext?.spanId).toBe(parent.spanContext().spanId)
  })

  test("root starts a new trace that keeps the given links", async () => {
    await withSpan(TRACER, "parent", {}, () =>
      withSpan(
        TRACER,
        "root",
        { root: true, links: linksToActiveSpan(), kind: SpanKind.INTERNAL },
        () => undefined
      )
    )

    const parent = spanNamed("parent")
    const root = spanNamed("root")
    expect(root.parentSpanContext).toBeUndefined()
    expect(root.spanContext().traceId).not.toBe(parent.spanContext().traceId)
    expect(root.links.map((link) => link.context.spanId)).toEqual([
      parent.spanContext().spanId,
    ])
  })
})

describe("withServerSpan", () => {
  test("records a SERVER span with the request attributes and the response status", async () => {
    await withServerSpan(
      TRACER,
      request({ "user-agent": "bun-test" }),
      async (span) => {
        span.updateName("POST /rpc/*")
        span.setAttribute("http.route", "/rpc/*")
        return new Response("ok", { status: 200 })
      }
    )

    const span = onlySpan()
    expect(span.name).toBe("POST /rpc/*")
    expect(span.kind).toBe(SpanKind.SERVER)
    expect(span.attributes).toMatchObject({
      "http.request.method": "POST",
      "url.path": "/rpc/v1/cron/list",
      "user_agent.original": "bun-test",
      "http.route": "/rpc/*",
      "http.response.status_code": 200,
    })
    expect(span.status.code).toBe(SpanStatusCode.UNSET)
  })

  test("continues the trace of an incoming traceparent", async () => {
    await withServerSpan(
      TRACER,
      request({ traceparent: traceparent("01") }),
      () => Promise.resolve(new Response(null, { status: 204 }))
    )

    const span = onlySpan()
    expect(span.spanContext().traceId).toBe(REMOTE_TRACE_ID)
    expect(span.parentSpanContext?.spanId).toBe(REMOTE_SPAN_ID)
  })

  test("a 5xx response fails the span and a 4xx does not", async () => {
    await withServerSpan(TRACER, request(), () =>
      Promise.resolve(new Response(null, { status: 503 }))
    )
    expect(onlySpan().status.code).toBe(SpanStatusCode.ERROR)

    tracing.reset()
    await withServerSpan(TRACER, request(), () =>
      Promise.resolve(new Response(null, { status: 404 }))
    )
    expect(onlySpan().status.code).toBe(SpanStatusCode.UNSET)
  })

  test("a throwing handler fails the span and the error is rethrown", async () => {
    const error = new Error("handler failed")

    await expect(
      withServerSpan(TRACER, request(), () => Promise.reject(error))
    ).rejects.toBe(error)

    const span = onlySpan()
    expect(span.status.code).toBe(SpanStatusCode.ERROR)
    expect(span.ended).toBe(true)
  })
})

describe("injectTraceHeaders", () => {
  test("adds the active span's traceparent to a copy of the headers", async () => {
    const headers = { cookie: "session=1" }

    const injected = await withSpan(TRACER, "outgoing", {}, (span) => {
      const { traceId, spanId } = span.spanContext()
      return { result: injectTraceHeaders(headers), traceId, spanId }
    })

    expect(injected.result).toEqual({
      cookie: "session=1",
      traceparent: `00-${injected.traceId}-${injected.spanId}-01`,
    })
    expect(headers).toEqual({ cookie: "session=1" })
  })

  test("leaves the headers unchanged outside a span", () => {
    expect(injectTraceHeaders({ cookie: "session=1" })).toEqual({
      cookie: "session=1",
    })
  })
})

describe("activeTraceFields", () => {
  test("is empty outside a span", () => {
    expect(activeTraceFields()).toEqual({})
  })

  test("carries the ids of a sampled active span", async () => {
    const fields = await withSpan(TRACER, "work", {}, (span) => ({
      fields: activeTraceFields(),
      context: span.spanContext(),
    }))

    expect(fields.fields).toEqual({
      traceId: fields.context.traceId,
      spanId: fields.context.spanId,
    })
  })

  test("is empty inside a span whose trace is not sampled", async () => {
    const fields = await withServerSpan(
      TRACER,
      request({ traceparent: traceparent("00") }),
      async () => new Response(JSON.stringify(activeTraceFields()))
    ).then((response) => response.json())

    expect(fields).toEqual({})
    expect(tracing.spans()).toEqual([])
  })
})

describe("linksToActiveSpan", () => {
  test("is empty outside a span", () => {
    expect(linksToActiveSpan()).toEqual([])
  })
})

describe("withoutTracing", () => {
  test("records no span inside it, nested ones included", async () => {
    const result = await withoutTracing(() =>
      withSpan(TRACER, "outer", {}, () =>
        withSpan(TRACER, "inner", {}, (span) => span.isRecording())
      )
    )

    expect(result).toBe(false)
    expect(tracing.spans()).toEqual([])
  })

  test("leaves tracing on outside it", async () => {
    withoutTracing(() => undefined)
    await withSpan(TRACER, "after", {}, () => undefined)

    expect(tracing.spans().map((span) => span.name)).toEqual(["after"])
  })
})
