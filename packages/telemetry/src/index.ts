import {
  context,
  propagation,
  type TracerProvider,
  trace,
} from "@opentelemetry/api"
import { AsyncLocalStorageContextManager } from "@opentelemetry/context-async-hooks"
import { W3CTraceContextPropagator } from "@opentelemetry/core"
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http"
import { resourceFromAttributes } from "@opentelemetry/resources"
import {
  BasicTracerProvider,
  BatchSpanProcessor,
  ParentBasedSampler,
  type SpanProcessor,
  TraceIdRatioBasedSampler,
} from "@opentelemetry/sdk-trace-base"
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions"

/**
 * What `startTelemetry` needs from an instrumentation (e.g. oRPC's
 * `ORPCInstrumentation`). Typed structurally so this package doesn't depend
 * on `@opentelemetry/instrumentation`: only the app that uses one does.
 */
export interface TracingInstrumentation {
  setTracerProvider(tracerProvider: TracerProvider): void
  enable(): void
  disable(): void
}

export interface TelemetryOptions {
  /** `service.name` on every span: the logger's `service` value. */
  serviceName: string
  /** `deployment.environment.name`, e.g. `NODE_ENV`. */
  environment: string
  /** OTLP/HTTP base URL (`OTEL_EXPORTER_OTLP_ENDPOINT`); unset turns
   * telemetry off. Spans go to `<endpoint>/v1/traces`. */
  endpoint: string | undefined
  /** Probability that a new trace is sampled (`OTEL_TRACES_SAMPLER_ARG`).
   * Spans with a parent follow the parent's decision. */
  sampleRatio: number
  /** Built only when telemetry is on, so a disabled app never creates
   * them. */
  instrumentations?: () => TracingInstrumentation[]
  /** Replaces the OTLP batch exporter. Tests pass an in-memory one, which
   * also turns telemetry on without an endpoint. */
  spanProcessor?: SpanProcessor
}

export interface Telemetry {
  /** Exports every finished span still waiting in the batch, then
   * unregisters the pipeline. */
  shutdown(): Promise<void>
}

const disabledTelemetry: Telemetry = {
  shutdown: () => Promise.resolve(),
}

function tracesUrl(endpoint: string): string {
  return `${endpoint.replace(/\/+$/, "")}/v1/traces`
}

function resolveSpanProcessor(
  options: TelemetryOptions
): SpanProcessor | undefined {
  if (options.spanProcessor !== undefined) return options.spanProcessor
  if (options.endpoint === undefined) return undefined
  return new BatchSpanProcessor(
    new OTLPTraceExporter({ url: tracesUrl(options.endpoint) })
  )
}

function unregisterGlobals(): void {
  trace.disable()
  context.disable()
  propagation.disable()
}

function setGlobals(provider: BasicTracerProvider): boolean {
  const contextSet = context.setGlobalContextManager(
    new AsyncLocalStorageContextManager().enable()
  )
  const propagatorSet = propagation.setGlobalPropagator(
    new W3CTraceContextPropagator()
  )
  const providerSet = trace.setGlobalTracerProvider(provider)
  return contextSet && propagatorSet && providerSet
}

/**
 * Registers without unregistering first whenever possible: `trace.disable()`
 * swaps the global proxy provider, so tracers taken before it (a middleware
 * built at import time) would stay no-ops for good. Only when a pipeline is
 * already registered (test files starting their own) is it replaced.
 */
function registerGlobals(provider: BasicTracerProvider): void {
  if (setGlobals(provider)) return
  unregisterGlobals()
  setGlobals(provider)
}

/**
 * Registers the global OpenTelemetry trace pipeline: a tracer provider with
 * a parent-based ratio sampler, `AsyncLocalStorage` context propagation
 * inside the process, W3C trace-context headers between processes, and a
 * batching OTLP/HTTP exporter. Nothing here patches modules, so it works on
 * Bun and inside a bundle with no `node_modules`.
 *
 * Without an endpoint (and no `spanProcessor`) nothing is registered: the
 * API keeps its no-op tracer and the returned `shutdown` does nothing.
 * A pipeline registered before (another test file's) is replaced.
 */
export function startTelemetry(options: TelemetryOptions): Telemetry {
  const spanProcessor = resolveSpanProcessor(options)
  if (spanProcessor === undefined) return disabledTelemetry

  const provider = new BasicTracerProvider({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: options.serviceName,
      "deployment.environment.name": options.environment,
    }),
    sampler: new ParentBasedSampler({
      root: new TraceIdRatioBasedSampler(options.sampleRatio),
    }),
    spanProcessors: [spanProcessor],
  })

  registerGlobals(provider)

  const instrumentations = options.instrumentations?.() ?? []
  for (const instrumentation of instrumentations) {
    instrumentation.setTracerProvider(provider)
    instrumentation.enable()
  }

  return {
    async shutdown() {
      for (const instrumentation of instrumentations) {
        instrumentation.disable()
      }
      try {
        await provider.shutdown()
      } finally {
        unregisterGlobals()
      }
    },
  }
}
