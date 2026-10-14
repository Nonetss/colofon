import { afterEach, describe, expect, spyOn, test } from "bun:test"
import { context, propagation, trace } from "@opentelemetry/api"

import { startTelemetry, type TracingInstrumentation } from "#index"
import { withServerSpan, withSpan } from "#span"
import { startTestTracing } from "#testing"

const TRACER = "test"

function unregisterGlobals() {
  trace.disable()
  context.disable()
  propagation.disable()
}

afterEach(unregisterGlobals)

function isRecording() {
  return withSpan(TRACER, "probe", {}, (span) => span.isRecording())
}

function fakeInstrumentation(): TracingInstrumentation & {
  events: string[]
} {
  const events: string[] = []
  return {
    events,
    setTracerProvider: () => events.push("setTracerProvider"),
    enable: () => events.push("enable"),
    disable: () => events.push("disable"),
  }
}

describe("startTelemetry", () => {
  test("without an endpoint registers nothing and never builds the instrumentations", async () => {
    unregisterGlobals()
    const fetchSpy = spyOn(globalThis, "fetch")
    let built = false

    const telemetry = startTelemetry({
      serviceName: "backend",
      environment: "test",
      endpoint: undefined,
      sampleRatio: 1,
      instrumentations: () => {
        built = true
        return []
      },
    })

    expect(await isRecording()).toBe(false)
    expect(built).toBe(false)
    await telemetry.shutdown()
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })

  test("enables the instrumentations with the provider and disables them on shutdown", async () => {
    const instrumentation = fakeInstrumentation()
    const tracing = startTestTracing()
    await tracing.shutdown()

    const telemetry = startTelemetry({
      serviceName: "backend",
      environment: "test",
      endpoint: undefined,
      sampleRatio: 1,
      instrumentations: () => [instrumentation],
      spanProcessor: {
        onStart: () => undefined,
        onEnd: () => undefined,
        forceFlush: () => Promise.resolve(),
        shutdown: () => Promise.resolve(),
      },
    })
    await telemetry.shutdown()

    expect(instrumentation.events).toEqual([
      "setTracerProvider",
      "enable",
      "disable",
    ])
  })

  test("ratio 0 drops new traces but follows a sampled parent", async () => {
    const tracing = startTestTracing(0)

    expect(await isRecording()).toBe(false)
    await withServerSpan(
      TRACER,
      new Request("https://example.test/", {
        headers: {
          traceparent:
            "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
        },
      }),
      () => Promise.resolve(new Response(null))
    )

    expect(tracing.spans().map((span) => span.spanContext().traceId)).toEqual([
      "4bf92f3577b34da6a3ce929d0e0e4736",
    ])
    await tracing.shutdown()
  })

  test("a tracer taken before the first start records once telemetry is on", async () => {
    unregisterGlobals()
    const early = trace.getTracer("early")

    const tracing = startTestTracing()
    early.startSpan("early span").end()

    expect(tracing.spans().map((span) => span.name)).toEqual(["early span"])
    await tracing.shutdown()
  })

  test("shutdown unregisters the pipeline", async () => {
    const tracing = startTestTracing()
    expect(await isRecording()).toBe(true)

    await tracing.shutdown()

    expect(await isRecording()).toBe(false)
  })
})
