import { z } from "zod"

export const SPAN_KINDS = [
  "unspecified",
  "internal",
  "server",
  "client",
  "producer",
  "consumer",
] as const

export const SPAN_STATUSES = ["unset", "ok", "error"] as const

/** Span attributes flattened from OTLP's typed values to plain JSON. */
const attributes = z
  .record(z.string(), z.json())
  .describe("Span attributes as plain JSON values")

const traceSummary = z.object({
  traceId: z.string(),
  rootService: z.string(),
  rootName: z.string(),
  startTime: z.string().describe("ISO start time of the trace"),
  durationMs: z.number(),
  errorCount: z.number().describe("Spans in error status across the trace"),
})

const traceSpan = z.object({
  spanId: z.string(),
  /** `null` for a root, or for a span whose parent isn't in the trace. */
  parentSpanId: z.string().nullable(),
  name: z.string(),
  service: z.string(),
  kind: z.enum(SPAN_KINDS),
  depth: z
    .number()
    .int()
    .describe("Nesting level in the waterfall: 0 for roots"),
  offsetMs: z
    .number()
    .describe("Milliseconds from the trace start to the span start"),
  durationMs: z.number(),
  status: z.enum(SPAN_STATUSES),
  statusMessage: z.string().nullable(),
  attributes,
  events: z.array(
    z.object({
      name: z.string(),
      offsetMs: z.number(),
      attributes,
    })
  ),
})

export const tracesOutput = {
  search: z.object({
    traces: z.array(traceSummary).describe("Newest first"),
    limitReached: z
      .boolean()
      .describe(
        "True when `limit` traces were returned, so older matches may be left out"
      ),
  }),
  get: z.object({
    traceId: z.string(),
    startTime: z.string().describe("ISO start time of the earliest span"),
    durationMs: z.number(),
    spanCount: z.number().int().describe("Every span in the trace"),
    errorCount: z.number().int(),
    truncated: z
      .boolean()
      .describe("True when spans past the response cap were left out"),
    spans: z
      .array(traceSpan)
      .describe(
        "Depth-first, siblings by start time: the order of a waterfall's rows"
      ),
  }),
}
