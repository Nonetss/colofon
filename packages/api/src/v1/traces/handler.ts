import { env } from "@nonete/env/server"
import type { z } from "zod"

import { errors } from "#errors"
import type { TRACE_SERVICES, tracesInput } from "#v1/traces/input"
import type { SPAN_KINDS, SPAN_STATUSES, tracesOutput } from "#v1/traces/output"
import {
  fetchTrace,
  type OtlpAnyValue,
  type OtlpKeyValue,
  type OtlpSpan,
  type ServiceSpan,
  searchTempo,
  type TempoSearchTrace,
} from "#v1/traces/tempo"

type SearchInput = z.infer<typeof tracesInput.search>
type GetInput = z.infer<typeof tracesInput.get>
type SearchOutput = z.infer<typeof tracesOutput.search>
type GetOutput = z.infer<typeof tracesOutput.get>
type TraceSpan = GetOutput["spans"][number]
type JsonValue = TraceSpan["attributes"][string]

/** Spans past this are left out of `traces.get`, flagged as `truncated`. */
export const MAX_TRACE_SPANS = 2000

const DEFAULT_SEARCH_WINDOW_MS = 24 * 60 * 60 * 1000

// ── TraceQL ──────────────────────────────────────────────────────────────────
//
// Tempo only takes queries as TraceQL text, and there is no TraceQL builder
// for JS, so the queries are assembled here, from fixed fragments only: every
// value that reaches them is a closed enum, a validated integer or a trace id
// normalized to hex, never free text, so nothing needs escaping.

type TraceService = (typeof TRACE_SERVICES)[number]

/** The span condition meaning "the trace touches this service". */
const TOUCHES = {
  "stack-frontend": 'resource.service.name = "stack-frontend"',
  "stack-backend": 'resource.service.name = "stack-backend"',
  postgresql: 'span.db.system.name = "postgresql"',
} satisfies Record<TraceService, string>

/** A span of the database the trace's queries reach. */
const DATABASE_SPANSET = `{ ${TOUCHES.postgresql} }`

/** oRPC's span around a streamed output: the trace is an event stream. */
const STREAM_SPAN_NAME = "consume_async_iterator_object_output"

const STREAM_SPANSET = `{ name = "${STREAM_SPAN_NAME}" }`

/**
 * The search's spansets, ANDed: each spanset may match a different span of
 * the trace (a backend span, an error somewhere else), whereas conditions
 * inside one `{ }` would all have to hold on the same span.
 */
function searchSpansets(input: SearchInput): string[] {
  const spansets: string[] = []
  if (input.services !== undefined && input.services.length > 0) {
    const touches = input.services.map((service) => TOUCHES[service])
    spansets.push(`{ ${touches.join(" || ")} }`)
  }
  if (input.errorsOnly) spansets.push("{ status = error }")
  if (input.minDurationMs !== undefined) {
    spansets.push(`{ trace:duration >= ${input.minDurationMs}ms }`)
  }
  return spansets
}

function joinSpansets(spansets: string[]): string {
  if (spansets.length === 0) return "{ }"
  return spansets.join(" && ")
}

/**
 * The search itself. `most_recent=true` makes Tempo return the newest
 * matches: without it, it returns the first ones it finds, so a busy day
 * fills the page with traces from hours ago.
 */
export function buildTraceQL(input: SearchInput): string {
  return `${joinSpansets(searchSpansets(input))} with (most_recent=true)`
}

/** Which of the given traces (hex ids) have a span matching `spanset`.
 *  Tempo's search returns the first matches it finds, not the newest, so
 *  the traces are named by id rather than re-searched by filter. */
export function buildByIdTraceQL(
  spanset: string,
  traceIds: readonly string[]
): string {
  const ids = traceIds.map((id) => `trace:id = "${id}"`)
  return joinSpansets([spanset, `{ ${ids.join(" || ")} }`])
}

/** Tempo takes the search window as Unix seconds. */
function searchWindow(input: SearchInput): { start: number; end: number } {
  const now = Date.now()
  const end = input.to === undefined ? now : Date.parse(input.to)
  const start =
    input.from === undefined
      ? now - DEFAULT_SEARCH_WINDOW_MS
      : Date.parse(input.from)
  return { start: Math.floor(start / 1000), end: Math.ceil(end / 1000) }
}

// ── Mapping ──────────────────────────────────────────────────────────────────

const ID_PATTERN = /^[0-9a-f]+$/i

/**
 * Hex span/trace id. Tempo's v2 JSON sends ids base64-encoded (proto3
 * mapping); hex ids pass through, and the search API's hex trace ids get
 * the leading zeros it trims back.
 */
export function toHexId(id: string, bytes: number): string {
  if (id.length <= bytes * 2 && ID_PATTERN.test(id)) {
    return id.toLowerCase().padStart(bytes * 2, "0")
  }
  return Buffer.from(id, "base64").toString("hex")
}

function nanos(value: string): bigint {
  return BigInt(value)
}

/** Milliseconds between two nanosecond timestamps, to the microsecond. */
function msBetween(from: bigint, to: bigint): number {
  return Number((to - from) / 1000n) / 1000
}

function nanosToIso(value: bigint): string {
  return new Date(Number(value / 1_000_000n)).toISOString()
}

function intValueOf(value: string | number): number {
  if (typeof value === "number") return value
  return Number(value)
}

function jsonValueOf(value: OtlpAnyValue | undefined): JsonValue {
  if (value === undefined) return null
  if (value.stringValue !== undefined) return value.stringValue
  if (value.boolValue !== undefined) return value.boolValue
  if (value.intValue !== undefined) return intValueOf(value.intValue)
  if (value.doubleValue !== undefined) return value.doubleValue
  if (value.bytesValue !== undefined) return value.bytesValue
  if (value.arrayValue !== undefined) {
    return (value.arrayValue.values ?? []).map(jsonValueOf)
  }
  if (value.kvlistValue !== undefined) {
    return attributesOf(value.kvlistValue.values)
  }
  return null
}

function attributesOf(
  keyValues: OtlpKeyValue[] | undefined
): Record<string, JsonValue> {
  const attributes: Record<string, JsonValue> = {}
  for (const { key, value } of keyValues ?? []) {
    attributes[key] = jsonValueOf(value)
  }
  return attributes
}

const spanKinds: Record<string, (typeof SPAN_KINDS)[number]> = {
  SPAN_KIND_INTERNAL: "internal",
  SPAN_KIND_SERVER: "server",
  SPAN_KIND_CLIENT: "client",
  SPAN_KIND_PRODUCER: "producer",
  SPAN_KIND_CONSUMER: "consumer",
}

function kindOf(kind: string | undefined): (typeof SPAN_KINDS)[number] {
  if (kind === undefined) return "unspecified"
  return spanKinds[kind] ?? "unspecified"
}

function statusOf(span: OtlpSpan): (typeof SPAN_STATUSES)[number] {
  const code = span.status?.code
  if (code === "STATUS_CODE_ERROR") return "error"
  if (code === "STATUS_CODE_OK") return "ok"
  return "unset"
}

function statusMessageOf(span: OtlpSpan): string | null {
  const message = span.status?.message
  if (message === undefined || message === "") return null
  return message
}

function errorCountOf(trace: TempoSearchTrace): number {
  let count = 0
  for (const stats of Object.values(trace.serviceStats ?? {})) {
    count += stats.errorCount ?? 0
  }
  return count
}

/** The services with spans in the trace, frontend first, then the
 *  database when the trace queried it. */
function servicesOf(trace: TempoSearchTrace, queriedDatabase: boolean) {
  const services = Object.keys(trace.serviceStats ?? {})
    .sort()
    .reverse()
  if (queriedDatabase) services.push("postgresql")
  return services
}

/** The page's traces that queried the database and that are streams. */
interface TraceMarks {
  database: Set<string>
  stream: Set<string>
}

function toSummary(trace: TempoSearchTrace, marks: TraceMarks) {
  const traceId = toHexId(trace.traceID, 16)
  return {
    traceId,
    rootService: trace.rootServiceName ?? "",
    services: servicesOf(trace, marks.database.has(traceId)),
    streaming: marks.stream.has(traceId),
    rootName: trace.rootTraceName ?? "",
    startTime: nanosToIso(nanos(trace.startTimeUnixNano)),
    durationMs: trace.durationMs ?? 0,
    errorCount: errorCountOf(trace),
  }
}

function newestFirst(a: TempoSearchTrace, b: TempoSearchTrace): number {
  const aStart = nanos(a.startTimeUnixNano)
  const bStart = nanos(b.startTimeUnixNano)
  if (aStart > bStart) return -1
  if (aStart < bStart) return 1
  return 0
}

// ── Waterfall layout ─────────────────────────────────────────────────────────

interface LayoutNode {
  id: string
  parentId: string | null
  start: bigint
  entry: ServiceSpan
}

function byStart(a: LayoutNode, b: LayoutNode): number {
  if (a.start < b.start) return -1
  if (a.start > b.start) return 1
  return 0
}

function toNode(entry: ServiceSpan): LayoutNode {
  const { span } = entry
  let parentId: string | null = null
  if (span.parentSpanId !== undefined && span.parentSpanId !== "") {
    parentId = toHexId(span.parentSpanId, 8)
  }
  return {
    id: toHexId(span.spanId, 8),
    parentId,
    start: nanos(span.startTimeUnixNano),
    entry,
  }
}

/**
 * Depth-first order with siblings by start time, each node with its depth:
 * the rows of a waterfall. A span whose parent isn't in the trace (not
 * flushed yet, or dropped upstream) is placed as a root.
 */
export function layoutSpans(
  entries: ServiceSpan[]
): { node: LayoutNode; depth: number }[] {
  const nodes = entries.map(toNode).sort(byStart)
  const ids = new Set(nodes.map((node) => node.id))
  const children = new Map<string, LayoutNode[]>()
  const roots: LayoutNode[] = []

  for (const node of nodes) {
    if (node.parentId === null || !ids.has(node.parentId)) {
      roots.push(node)
      continue
    }
    const siblings = children.get(node.parentId)
    if (siblings) siblings.push(node)
    else children.set(node.parentId, [node])
  }

  const ordered: { node: LayoutNode; depth: number }[] = []
  const visit = (node: LayoutNode, depth: number) => {
    ordered.push({ node, depth })
    for (const child of children.get(node.id) ?? []) visit(child, depth + 1)
  }
  for (const root of roots) visit(root, 0)
  return ordered
}

function parentIdOf(node: LayoutNode, depth: number): string | null {
  if (depth === 0) return null
  return node.parentId
}

/**
 * A query span is emitted by the backend's process but is the database's
 * work, so it is shown under the database system it names (`postgresql`)
 * rather than under `stack-backend`.
 */
function serviceOf(
  service: string,
  attributes: Record<string, JsonValue>
): string {
  const dbSystem = attributes["db.system.name"]
  if (typeof dbSystem === "string" && dbSystem !== "") return dbSystem
  return service
}

type SpanBar = TraceSpan["bar"]

/** Rounds to the microsecond, the precision every offset here has. */
function roundMs(ms: number): number {
  return Math.round(ms * 1000) / 1000
}

/**
 * Where to draw a span: its measured range kept inside its parent's bar
 * and inside `[0, scaleMs]`. Start times only have millisecond resolution
 * (the SDK takes them from `Date.now()`), so a child can measure up to 1 ms
 * past its parent; the drawing never shows that, while `offsetMs` and
 * `durationMs` keep the measured values.
 */
export function spanBar(
  measured: { offsetMs: number; durationMs: number },
  parent: SpanBar | undefined,
  scaleMs: number
): SpanBar {
  const end = measured.offsetMs + measured.durationMs
  let low = 0
  let high = scaleMs
  if (parent !== undefined) {
    low = parent.offsetMs
    high = Math.min(parent.offsetMs + parent.durationMs, scaleMs)
  }
  const start = Math.min(Math.max(measured.offsetMs, low), high)
  const finish = Math.max(Math.min(end, high), start)
  return {
    offsetMs: roundMs(start),
    durationMs: roundMs(finish - start),
    continues: end > scaleMs + 0.001,
  }
}

function toTraceSpan(
  node: LayoutNode,
  depth: number,
  traceStart: bigint,
  bar: SpanBar
): TraceSpan {
  const { span, service } = node.entry
  const attributes = attributesOf(span.attributes)
  return {
    spanId: node.id,
    parentSpanId: parentIdOf(node, depth),
    name: span.name,
    service: serviceOf(service, attributes),
    kind: kindOf(span.kind),
    depth,
    offsetMs: msBetween(traceStart, node.start),
    durationMs: msBetween(node.start, nanos(span.endTimeUnixNano)),
    bar,
    status: statusOf(span),
    statusMessage: statusMessageOf(span),
    attributes,
    events: (span.events ?? []).map((event) => ({
      name: event.name,
      offsetMs: msBetween(traceStart, nanos(event.timeUnixNano)),
      attributes: attributesOf(event.attributes),
    })),
  }
}

/**
 * What the waterfall is drawn to: the whole trace, except for an event
 * stream, which lasts as long as its subscription. That one is drawn to its
 * request (the first root span, which ends when the response carrying the
 * open stream is returned), so the request stays readable.
 */
function waterfallScale(
  ordered: { node: LayoutNode; depth: number }[],
  streaming: boolean,
  durationMs: number
): number {
  const root = ordered[0]
  if (!streaming || root === undefined) return durationMs
  const rootMs = msBetween(
    root.node.start,
    nanos(root.node.entry.span.endTimeUnixNano)
  )
  if (rootMs <= 0) return durationMs
  return rootMs
}

/** Earliest start and latest end across a non-empty list of spans. */
function traceBounds(entries: ServiceSpan[]): { start: bigint; end: bigint } {
  let start: bigint | undefined
  let end: bigint | undefined
  for (const { span } of entries) {
    const spanStart = nanos(span.startTimeUnixNano)
    const spanEnd = nanos(span.endTimeUnixNano)
    if (start === undefined || spanStart < start) start = spanStart
    if (end === undefined || spanEnd > end) end = spanEnd
  }
  if (start === undefined || end === undefined) {
    throw errors.NOT_FOUND({ message: "Traza no encontrada" })
  }
  return { start, end }
}

/**
 * Which of the found traces have a span matching `spanset` (a database
 * query, a stream). Tempo's search reports the services that emitted spans,
 * not what they did, so a second search over exactly those trace ids
 * answers it.
 */
async function searchMatchingIds(
  tempoUrl: string,
  window: { start: number; end: number },
  traces: TempoSearchTrace[],
  spanset: string
): Promise<Set<string>> {
  if (traces.length === 0) return new Set()
  const matches = await searchTempo(tempoUrl, {
    // Normalized hex: whatever Tempo sent, only [0-9a-f] reaches the query.
    query: buildByIdTraceQL(
      spanset,
      traces.map((trace) => toHexId(trace.traceID, 16))
    ),
    ...window,
    limit: traces.length,
  })
  return new Set(matches.map((trace) => toHexId(trace.traceID, 16)))
}

function requireTempoUrl(): string {
  if (env.TEMPO_URL === undefined) {
    throw errors.SERVICE_UNAVAILABLE({
      message: "El almacén de trazas no está configurado (TEMPO_URL)",
    })
  }
  return env.TEMPO_URL
}

export const tracesHandler = {
  search: async ({ input }: { input: SearchInput }): Promise<SearchOutput> => {
    // Unset TEMPO_URL is a supported configuration: the viewer just has
    // nothing to show, like the activity log without LOKI_URL.
    if (env.TEMPO_URL === undefined) {
      return { traces: [], limitReached: false }
    }

    const window = searchWindow(input)
    const traces = await searchTempo(env.TEMPO_URL, {
      query: buildTraceQL(input),
      ...window,
      limit: input.limit,
    })
    const [database, stream] = await Promise.all([
      searchMatchingIds(env.TEMPO_URL, window, traces, DATABASE_SPANSET),
      searchMatchingIds(env.TEMPO_URL, window, traces, STREAM_SPANSET),
    ])

    return {
      traces: [...traces]
        .sort(newestFirst)
        .map((trace) => toSummary(trace, { database, stream })),
      limitReached: traces.length >= input.limit,
    }
  },

  get: async ({ input }: { input: GetInput }): Promise<GetOutput> => {
    const entries = await fetchTrace(requireTempoUrl(), input.traceId)
    if (entries === null) {
      throw errors.NOT_FOUND({ message: "Traza no encontrada" })
    }

    const { start, end } = traceBounds(entries)
    const durationMs = msBetween(start, end)
    const ordered = layoutSpans(entries)
    const errorCount = entries.filter(
      ({ span }) => span.status?.code === "STATUS_CODE_ERROR"
    ).length
    const streaming = entries.some(({ span }) => span.name === STREAM_SPAN_NAME)
    const scaleMs = waterfallScale(ordered, streaming, durationMs)

    // Parents come before their children in depth-first order, so each
    // child's bar is computed against a bar that already exists.
    const bars = new Map<string, SpanBar>()
    const spans: TraceSpan[] = []
    for (const { node, depth } of ordered.slice(0, MAX_TRACE_SPANS)) {
      const measured = {
        offsetMs: msBetween(start, node.start),
        durationMs: msBetween(
          node.start,
          nanos(node.entry.span.endTimeUnixNano)
        ),
      }
      const parentId = parentIdOf(node, depth)
      const parent = parentId === null ? undefined : bars.get(parentId)
      const bar = spanBar(measured, parent, scaleMs)
      bars.set(node.id, bar)
      spans.push(toTraceSpan(node, depth, start, bar))
    }

    return {
      traceId: input.traceId,
      startTime: nanosToIso(start),
      durationMs,
      scaleMs,
      streaming,
      spanCount: entries.length,
      errorCount,
      truncated: ordered.length > MAX_TRACE_SPANS,
      spans,
    }
  },
}
