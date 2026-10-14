import { httpInstrumentationMiddleware } from "@hono/otel"
import { createMiddleware } from "hono/factory"

// Built at import time, before `startTelemetry` runs: it reads the global
// tracer provider lazily, so its spans record once telemetry is on and are
// no-ops while it is off. No metrics: nothing registers a meter provider.
const traceHttp = httpInstrumentationMiddleware({
  captureActiveRequests: false,
})

/**
 * One `SERVER` span per request (`<METHOD> <matched route>`, e.g.
 * `POST /rpc/*`), continuing the caller's `traceparent`. Registered first, so
 * request logging, session resolution and oRPC's own spans run inside it.
 * The compose healthcheck's `GET /` every 10 s is left out.
 */
export const requestTracing = createMiddleware(async (c, next) => {
  if (c.req.method === "GET" && c.req.path === "/") return next()
  return traceHttp(c, next)
})
