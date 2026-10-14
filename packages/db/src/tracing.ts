import type { TracingInstrumentation } from "@nonete/telemetry"
import { PgInstrumentation } from "@opentelemetry/instrumentation-pg"
import pg from "pg"

/**
 * One `CLIENT` span per PostgreSQL query, from OpenTelemetry's own `pg`
 * instrumentation. Its usual setup patches `pg` when it is loaded, through
 * module hooks that neither Bun nor a bundle without `node_modules` run, so
 * here the patch is applied by hand to the `pg` this process imports: the
 * same `Client` Drizzle's pool uses, so pool queries and transactions are
 * both covered.
 *
 * Only queries inside a trace (a request, a cron run) get a span; startup
 * migrations and the scheduler's polling stay out instead of becoming one
 * tiny trace each. Spans carry the query text with its `$n` placeholders,
 * never the parameter values (`enhancedDatabaseReporting` stays off).
 *
 * Pass it to `startTelemetry` in `instrumentations`.
 */
export function pgTracing(): TracingInstrumentation {
  // `enabled: false`: enabling would install the module hooks; the patch
  // below is what actually instruments `pg`.
  const instrumentation = new PgInstrumentation({
    enabled: false,
    requireParentSpan: true,
  })
  const definition = instrumentation
    .getModuleDefinitions()
    .find((candidate) => candidate.name === "pg")

  return {
    setTracerProvider: (tracerProvider) => {
      instrumentation.setTracerProvider(tracerProvider)
    },
    enable: () => {
      definition?.patch?.(pg)
    },
    disable: () => {
      definition?.unpatch?.(pg)
    },
  }
}
