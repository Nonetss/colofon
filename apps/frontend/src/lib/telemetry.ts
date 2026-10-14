import {
  OTEL_EXPORTER_OTLP_ENDPOINT,
  OTEL_TRACES_SAMPLER_ARG,
} from "astro:env/server"
import { startTelemetry, type Telemetry } from "@nonete/telemetry"

/** Tracer name of the SSR server's own spans. */
export const FRONTEND_TRACER = "frontend"

declare global {
  var __frontendTelemetry: Telemetry | undefined
}

// Once per process: Vite's dev SSR re-evaluates this module on edits, but
// globalThis survives. Off, and free, without an OTLP endpoint. Astro's
// standalone server has no shutdown hook, so the last batch (at most ~5 s of
// spans) can be lost when the container stops.
if (!globalThis.__frontendTelemetry) {
  globalThis.__frontendTelemetry = startTelemetry({
    serviceName: "frontend",
    environment: import.meta.env.MODE,
    endpoint: OTEL_EXPORTER_OTLP_ENDPOINT,
    sampleRatio: OTEL_TRACES_SAMPLER_ARG,
  })
}
