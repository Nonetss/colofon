import {
  type Attributes,
  context,
  type Exception,
  type Link,
  propagation,
  type Span,
  SpanKind,
  type SpanOptions,
  SpanStatusCode,
  type TextMapGetter,
  TraceFlags,
  trace,
} from "@opentelemetry/api"
import { suppressTracing } from "@opentelemetry/core"
import {
  ATTR_HTTP_REQUEST_METHOD,
  ATTR_HTTP_RESPONSE_STATUS_CODE,
  ATTR_URL_PATH,
  ATTR_USER_AGENT_ORIGINAL,
} from "@opentelemetry/semantic-conventions"

/**
 * Span helpers that depend on `@opentelemetry/api` (and `core`'s context
 * helpers) only, so any package can create spans without pulling in the SDK. With no tracer provider
 * registered (telemetry off, see `startTelemetry`) the API hands out no-op
 * spans and every helper here costs next to nothing.
 */

export type { Attributes, Link, Span, SpanOptions }
export { SpanKind, SpanStatusCode }

function exceptionOf(error: unknown): Exception {
  if (error instanceof Error) return error
  return String(error)
}

function messageOf(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error)
}

/** Records `error` on `span` and marks the span as failed. */
export function recordSpanError(span: Span, error: unknown): void {
  span.recordException(exceptionOf(error))
  span.setStatus({ code: SpanStatusCode.ERROR, message: messageOf(error) })
}

/**
 * Runs `fn` inside a new active span. The span records the error and is
 * marked as failed when `fn` throws or rejects, and always ends; the
 * original error is rethrown unchanged.
 */
export function withSpan<T>(
  tracerName: string,
  spanName: string,
  options: SpanOptions,
  fn: (span: Span) => Promise<T> | T
): Promise<T> {
  return trace
    .getTracer(tracerName)
    .startActiveSpan(spanName, options, async (span) => {
      try {
        return await fn(span)
      } catch (error) {
        recordSpanError(span, error)
        throw error
      } finally {
        span.end()
      }
    })
}

const headersGetter: TextMapGetter<Headers> = {
  keys: (headers) => [...headers.keys()],
  get: (headers, key) => headers.get(key) ?? undefined,
}

function requestAttributes(request: Request): Attributes {
  const attributes: Attributes = {
    [ATTR_HTTP_REQUEST_METHOD]: request.method,
    [ATTR_URL_PATH]: new URL(request.url).pathname,
  }
  const userAgent = request.headers.get("user-agent")
  if (userAgent !== null) attributes[ATTR_USER_AGENT_ORIGINAL] = userAgent
  return attributes
}

/**
 * Runs `fn` inside a `SERVER` span for `request`, continuing the trace of
 * the request's `traceparent` header when it has one. The span is named
 * after the method; `fn` renames it (and sets `http.route`) once the route
 * is known. The response's status is recorded and a 5xx marks the span as
 * failed. The span ends when `fn` returns its response, so a streamed body
 * never keeps it open.
 */
export function withServerSpan(
  tracerName: string,
  request: Request,
  fn: (span: Span) => Promise<Response>
): Promise<Response> {
  const parent = propagation.extract(
    context.active(),
    request.headers,
    headersGetter
  )
  return trace
    .getTracer(tracerName)
    .startActiveSpan(
      request.method,
      { kind: SpanKind.SERVER, attributes: requestAttributes(request) },
      parent,
      async (span) => {
        try {
          const response = await fn(span)
          span.setAttribute(ATTR_HTTP_RESPONSE_STATUS_CODE, response.status)
          if (response.status >= 500) {
            span.setStatus({ code: SpanStatusCode.ERROR })
          }
          return response
        } catch (error) {
          recordSpanError(span, error)
          throw error
        } finally {
          span.end()
        }
      }
    )
}

/**
 * Runs `fn` with tracing switched off: every span started inside it, by any
 * instrumentation (oRPC, `pg`), is a no-op that is never exported, so the
 * work leaves no trace at all rather than a trace hidden later. For
 * requests not worth tracing, like the trace viewer reading traces.
 */
export function withoutTracing<T>(fn: () => T): T {
  return context.with(suppressTracing(context.active()), fn)
}

/**
 * Returns a copy of `headers` carrying the active trace context
 * (`traceparent`, and `tracestate` when set), for an outgoing request that
 * should continue the current trace. Unchanged when no span is active.
 */
export function injectTraceHeaders(
  headers: Record<string, string>
): Record<string, string> {
  const carrier = { ...headers }
  propagation.inject(context.active(), carrier)
  return carrier
}

function isSampled(span: Span): boolean {
  return (span.spanContext().traceFlags & TraceFlags.SAMPLED) !== 0
}

/**
 * `{ traceId, spanId }` of the active span when its trace is sampled,
 * otherwise `{}`: an unsampled trace is never stored, so its id would point
 * at nothing. Used as pino's `mixin`, so every log line written inside a
 * traced request carries the ids.
 */
export function activeTraceFields(): { traceId?: string; spanId?: string } {
  const span = trace.getActiveSpan()
  if (span === undefined || !isSampled(span)) return {}
  const { traceId, spanId } = span.spanContext()
  return { traceId, spanId }
}

/**
 * A link to the active span, for work that starts its own trace but was
 * triggered from inside another one (a manually started cron run).
 */
export function linksToActiveSpan(): Link[] {
  const span = trace.getActiveSpan()
  if (span === undefined || !isSampled(span)) return []
  return [{ context: span.spanContext() }]
}
