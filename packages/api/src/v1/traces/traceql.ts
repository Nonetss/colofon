import type { TRACE_SERVICES } from "#v1/traces/input"

/**
 * TraceQL for Tempo's search: the only place in the API that writes it.
 *
 * Tempo only takes queries as text, and there is no TraceQL builder for JS,
 * so the text is assembled here from a closed vocabulary: fixed attributes,
 * strings quoted by `stringLiteral`, durations checked to be whole
 * milliseconds and trace ids checked to be hex. No value can change a
 * query's structure. Callers ask for a query by what it means
 * (`traceSearchQuery`, `markedTracesQuery`) and never see TraceQL, except
 * for `ROOT_NAME_TAG`, the identifier Tempo lists root span names under.
 */

type TraceService = (typeof TRACE_SERVICES)[number]

// ── Literals ─────────────────────────────────────────────────────────────────

/** What a TraceQL string literal escapes with `\` (Go's quoting rules). */
const STRING_META = /[\\"]/g

/** Raw control characters end a string literal's parse. */
const CONTROL_CHARACTER = /\p{Cc}/u

const HEX_TRACE_ID = /^[0-9a-f]{32}$/

function stringLiteral(value: string): string {
  if (CONTROL_CHARACTER.test(value)) {
    throw new Error("TraceQL strings can't hold control characters")
  }
  return `"${value.replace(STRING_META, "\\$&")}"`
}

function durationLiteral(ms: number): string {
  if (!Number.isSafeInteger(ms) || ms < 0) {
    throw new Error(`Invalid TraceQL duration: ${ms}`)
  }
  return `${ms}ms`
}

/** A 32-character lowercase hex trace id, as `toHexId` normalizes them. */
function traceIdLiteral(traceId: string): string {
  if (!HEX_TRACE_ID.test(traceId)) {
    throw new Error(`Invalid TraceQL trace id: ${traceId}`)
  }
  return stringLiteral(traceId)
}

// ── Spansets ─────────────────────────────────────────────────────────────────

/** The spans meeting any of `conditions`; `{ }` (every span) when none. */
function spanset(conditions: readonly string[]): string {
  if (conditions.length === 0) return "{ }"
  return `{ ${conditions.join(" || ")} }`
}

/**
 * The traces with a span in each spanset. Each may be a different span (a
 * backend span, an error somewhere else), whereas the conditions inside one
 * spanset would all have to hold on the same span.
 */
function allOf(spansets: readonly string[]): string {
  if (spansets.length === 0) return spanset([])
  return spansets.join(" && ")
}

/** The span condition meaning "the trace touches this service". */
const TOUCHES = {
  frontend: `resource.service.name = ${stringLiteral("frontend")}`,
  backend: `resource.service.name = ${stringLiteral("backend")}`,
  postgresql: `span.db.system.name = ${stringLiteral("postgresql")}`,
} satisfies Record<TraceService, string>

// ── Queries ──────────────────────────────────────────────────────────────────

/** The trace's root span name, as Tempo's tag-values API takes it. */
export const ROOT_NAME_TAG = "trace:rootName"

/** oRPC's span around a streamed output: the trace is an event stream. */
export const STREAM_SPAN_NAME = "consume_async_iterator_object_output"

/** What a second search can tell about traces already found. */
const MARKS = {
  /** A span of the database the trace's queries reach. */
  database: spanset([TOUCHES.postgresql]),
  /** oRPC's stream span: the trace is an event stream. */
  stream: spanset([`name = ${stringLiteral(STREAM_SPAN_NAME)}`]),
}

export type TraceMark = keyof typeof MARKS

/** The search's filters, all optional and ANDed. */
export interface TraceSearchFilters {
  /** Traces touching any of these; none or empty keeps all. */
  services?: readonly TraceService[]
  errorsOnly?: boolean
  minDurationMs?: number
  /** Traces whose root span has any of these names; none or empty keeps
   *  all. */
  names?: readonly string[]
}

function filterSpansets(filters: TraceSearchFilters): string[] {
  const spansets: string[] = []
  if (filters.services !== undefined && filters.services.length > 0) {
    spansets.push(spanset(filters.services.map((service) => TOUCHES[service])))
  }
  if (filters.errorsOnly) spansets.push(spanset(["status = error"]))
  if (filters.minDurationMs !== undefined) {
    spansets.push(
      spanset([`trace:duration >= ${durationLiteral(filters.minDurationMs)}`])
    )
  }
  if (filters.names !== undefined && filters.names.length > 0) {
    spansets.push(
      spanset(
        filters.names.map((name) => `${ROOT_NAME_TAG} = ${stringLiteral(name)}`)
      )
    )
  }
  return spansets
}

/**
 * The traces matching the filters. `most_recent=true` makes Tempo return
 * the newest matches: without it, it returns the first ones it finds, so a
 * busy day fills the page with traces from hours ago.
 */
export function traceSearchQuery(filters: TraceSearchFilters): string {
  return `${allOf(filterSpansets(filters))} with (most_recent=true)`
}

/**
 * Which of the given traces (hex ids) carry `mark`. Tempo's search returns
 * the first matches it finds, not the newest, so the traces are named by id
 * rather than re-searched by filter. Without ids the query would match every
 * trace, so asking for none is an error.
 */
export function markedTracesQuery(
  mark: TraceMark,
  traceIds: readonly string[]
): string {
  if (traceIds.length === 0) {
    throw new Error("A marked-traces query needs at least one trace id")
  }
  const ids = traceIds.map((id) => `trace:id = ${traceIdLiteral(id)}`)
  return allOf([MARKS[mark], spanset(ids)])
}
