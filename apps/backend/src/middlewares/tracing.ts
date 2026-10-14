import { httpInstrumentationMiddleware } from "@hono/otel"
import { withoutTracing } from "@nonete/telemetry/span"
import type { Context } from "hono"
import { createMiddleware } from "hono/factory"
import { routePath } from "hono/route"

/**
 * Paths whose URL already names the operation and never carries an id: an
 * oRPC procedure (`/rpc/v1/cron/list`), its OpenAPI twin (`/api/v1/cron/list`,
 * no procedure declares its own `path`) and Better Auth's fixed routes. Hono
 * only matched them with a wildcard (`/rpc/*`), which would give every call
 * the same name.
 */
const NAMED_BY_PATH = ["/rpc/", "/api/"]

/**
 * The span's route: the request path where it names the operation, else
 * Hono's matched pattern, so unknown paths (404s, scanners) never become a
 * new span name each.
 */
function traceRoute(c: Context): string {
  if (NAMED_BY_PATH.some((prefix) => c.req.path.startsWith(prefix))) {
    return c.req.path
  }
  return routePath(c)
}

// Built at import time, before `startTelemetry` runs: it reads the global
// tracer provider lazily, so its spans record once telemetry is on and are
// no-ops while it is off. No metrics: nothing registers a meter provider.
const traceHttp = httpInstrumentationMiddleware({
  captureActiveRequests: false,
  spanNameFactory: (c) => `${c.req.method} ${traceRoute(c)}`,
  getRoute: traceRoute,
})

/** The trace viewer's own procedures, over RPC and OpenAPI. */
const TRACE_VIEWER_PATHS = ["/rpc/v1/traces/", "/api/v1/traces/"]

function isHealthcheck(c: Context): boolean {
  return c.req.method === "GET" && c.req.path === "/"
}

/** The viewer reading traces: tracing it would fill the list with itself. */
function isTraceViewer(c: Context): boolean {
  return TRACE_VIEWER_PATHS.some((prefix) => c.req.path.startsWith(prefix))
}

/**
 * One `SERVER` span per request (`<METHOD> <route>`, e.g.
 * `QUERY /rpc/v1/cron/list`), continuing the caller's `traceparent`.
 * Registered first, so request logging, session resolution and oRPC's own
 * spans run inside it. Left out: the compose healthcheck's `GET /` every
 * 10 s and the trace viewer, both run with tracing switched off so neither
 * the request nor the spans inside it are recorded (the healthcheck still
 * goes through `sessionMiddleware`, whose Better Auth `getSession` span would
 * otherwise become a root trace of its own every 10 s).
 */
export const requestTracing = createMiddleware(async (c, next) => {
  if (isHealthcheck(c)) return withoutTracing(() => next())
  if (isTraceViewer(c)) return withoutTracing(() => next())
  return traceHttp(c, next)
})
