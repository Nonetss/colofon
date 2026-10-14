import type { Context } from "@opentelemetry/api"
import type {
  ReadableSpan,
  Span,
  SpanProcessor,
} from "@opentelemetry/sdk-trace-base"
import { startTelemetry } from "#index"

export type { ReadableSpan }

export interface TestTracing {
  /** Every span ended since the last `reset()`, in the order they ended. */
  spans(): ReadableSpan[]
  /** Resolves with the first span named `name` to end (already ended
   * ones included), for work that finishes after the call returns. */
  waitForSpan(name: string): Promise<ReadableSpan>
  reset(): void
  /** Unregisters the pipeline; call it in `afterAll`. */
  shutdown(): Promise<void>
}

interface Waiter {
  name: string
  resolve: (span: ReadableSpan) => void
}

class RecordingSpanProcessor implements SpanProcessor {
  ended: ReadableSpan[] = []
  private waiters: Waiter[] = []

  onStart(_span: Span, _parentContext: Context): void {}

  onEnd(span: ReadableSpan): void {
    this.ended.push(span)
    const matching = this.waiters.filter((waiter) => waiter.name === span.name)
    this.waiters = this.waiters.filter((waiter) => waiter.name !== span.name)
    for (const waiter of matching) waiter.resolve(span)
  }

  waitFor(name: string): Promise<ReadableSpan> {
    const ended = this.ended.find((span) => span.name === name)
    if (ended) return Promise.resolve(ended)
    return new Promise((resolve) => {
      this.waiters.push({ name, resolve })
    })
  }

  reset(): void {
    this.ended = []
    this.waiters = []
  }

  forceFlush(): Promise<void> {
    return Promise.resolve()
  }

  shutdown(): Promise<void> {
    return Promise.resolve()
  }
}

/**
 * Registers a real trace pipeline that keeps finished spans in memory, for
 * unit tests that assert on the spans code creates. Start it in `beforeAll`
 * and shut it down in `afterAll`, so every test file owns its pipeline.
 */
export function startTestTracing(sampleRatio = 1): TestTracing {
  const processor = new RecordingSpanProcessor()
  const telemetry = startTelemetry({
    serviceName: "test",
    environment: "test",
    endpoint: undefined,
    sampleRatio,
    spanProcessor: processor,
  })
  return {
    spans: () => [...processor.ended],
    waitForSpan: (name) => processor.waitFor(name),
    reset: () => processor.reset(),
    shutdown: telemetry.shutdown,
  }
}
