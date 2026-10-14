import { env } from "@nonete/env/server"
import type { z } from "zod"

import { errors } from "#errors"
import type { tracesInput } from "#v1/traces/input"
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
import {
  markedTracesQuery,
  STREAM_SPAN_NAME,
  type TraceMark,
  traceSearchQuery,
} from "#v1/traces/traceql"

type SearchInput = z.infer<typeof tracesInput.search>
type GetInput = z.infer<typeof tracesInput.get>
type SearchOutput = z.infer<typeof tracesOutput.search>
type GetOutput = z.infer<typeof tracesOutput.get>
type TraceSpan = GetOutput["spans"][number]
type JsonValue = TraceSpan["attributes"][string]

/** Spans past this are left out of `traces.get`, flagged as `truncated`. */
export const MAX_TRACE_SPANS = 2000

const DEFAULT_SEARCH_WINDOW_MS = 24 * 60 * 60 * 1000

// ── Paging ───────────────────────────────────────────────────────────────────
//
// Tempo's search has no cursor or offset, but it answers newest first, so a
// page is the same search over a window that ends at the previous page's
// oldest trace. The window is whole seconds, so it ends on the second after
// that trace, and the traces of that second already shown are dropped here.

const NANOS_PER_SECOND = 1_000_000_000n

/** Fetched past `limit` on a later page: room for the traces of the
 *  cursor's second that came back and are dropped. */
const CURSOR_SECOND_SLACK = 50

/** Where the previous page ended: the start and hex id of its oldest trace. */
interface SearchCursor {
  startNs: bigint
  traceId: string
}

/** The input's cursor, whose `<startNs>-<traceId>` shape it validated. */
function cursorOf(cursor: string | null | undefined): SearchCursor | undefined {
  if (!cursor) return undefined
  const separator = cursor.indexOf("-")
  return {
    startNs: BigInt(cursor.slice(0, separator)),
    traceId: cursor.slice(separator + 1),
  }
}

function encodeCursor(cursor: SearchCursor): string {
  return `${cursor.startNs}-${cursor.traceId}`
}

/** Tempo takes the search window as Unix seconds; a cursor ends it on the
 *  second after the previous page's oldest trace. */
function searchWindow(
  input: SearchInput,
  cursor: SearchCursor | undefined
): { start: number; end: number } {
  const now = Date.now()
  const end = input.to === undefined ? now : Date.parse(input.to)
  const start =
    input.from === undefined
      ? now - DEFAULT_SEARCH_WINDOW_MS
      : Date.parse(input.from)
  const window = { start: Math.floor(start / 1000), end: Math.ceil(end / 1000) }
  if (cursor === undefined) return window
  const cursorEnd = Number(cursor.startNs / NANOS_PER_SECOND + 1n)
  return { start: window.start, end: Math.min(window.end, cursorEnd) }
}

/** One more than the page, to know whether another follows, plus the
 *  slack for the cursor's second on a later page. */
function fetchLimitOf(limit: number, cursor: SearchCursor | undefined) {
  if (cursor === undefined) return limit + 1
  return limit + 1 + CURSOR_SECOND_SLACK
}

/** A found trace with what the page order needs: its hex id and start. */
interface FoundTrace {
  trace: TempoSearchTrace
  traceId: string
  startNs: bigint
}

function foundTraceOf(trace: TempoSearchTrace): FoundTrace {
  return {
    trace,
    traceId: toHexId(trace.traceID, 16),
    startNs: nanos(trace.startTimeUnixNano),
  }
}

/** Newest first, and by id (descending) between traces that start
 *  together, so the order is total and a cursor can resume it. */
function newestFirst(a: FoundTrace, b: FoundTrace): number {
  if (a.startNs > b.startNs) return -1
  if (a.startNs < b.startNs) return 1
  if (a.traceId > b.traceId) return -1
  if (a.traceId < b.traceId) return 1
  return 0
}

/** Whether the trace comes after the cursor, newest first. */
function isPastCursor(found: FoundTrace, cursor: SearchCursor | undefined) {
  if (cursor === undefined) return true
  if (found.startNs !== cursor.startNs) return found.startNs < cursor.startNs
  return found.traceId < cursor.traceId
}

/**
 * The cursor after `page`, or `null` when nothing follows. A page left
 * empty by a cut-off fetch means more traces share the cursor's second than
 * a fetch brings back: the rest of that second is skipped, so the next
 * page moves on instead of asking the same again.
 */
function nextCursorOf(
  page: FoundTrace[],
  hasMore: boolean,
  cursor: SearchCursor | undefined
): string | null {
  if (!hasMore) return null
  const last = page.at(-1)
  if (last !== undefined) return encodeCursor(last)
  if (cursor === undefined) return null
  const secondStart = (cursor.startNs / NANOS_PER_SECOND) * NANOS_PER_SECOND
  return encodeCursor({ startNs: secondStart - 1n, traceId: "f".repeat(32) })
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

function toSummary({ trace, traceId, startNs }: FoundTrace, marks: TraceMarks) {
  return {
    traceId,
    rootService: trace.rootServiceName ?? "",
    services: servicesOf(trace, marks.database.has(traceId)),
    streaming: marks.stream.has(traceId),
    rootName: trace.rootTraceName ?? "",
    startTime: nanosToIso(startNs),
    durationMs: trace.durationMs ?? 0,
    errorCount: errorCountOf(trace),
  }
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
 * rather than under `backend`.
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
 * Which of the found traces carry `mark` (they queried the database, or
 * are a stream). Tempo's search reports the services that emitted spans,
 * not what they did, so a second search over exactly those trace ids
 * answers it.
 */
async function searchMatchingIds(
  tempoUrl: string,
  window: { start: number; end: number },
  traces: FoundTrace[],
  mark: TraceMark
): Promise<Set<string>> {
  if (traces.length === 0) return new Set()
  const matches = await searchTempo(tempoUrl, {
    // Normalized hex: whatever Tempo sent, only [0-9a-f] reaches the query.
    query: markedTracesQuery(
      mark,
      traces.map((trace) => trace.traceId)
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
    if (env.TEMPO_URL === undefined) return { traces: [], nextCursor: null }

    const cursor = cursorOf(input.cursor)
    const window = searchWindow(input, cursor)
    // The cursor is past the range's start: every page has been read.
    if (window.end <= window.start) return { traces: [], nextCursor: null }

    const fetchLimit = fetchLimitOf(input.limit, cursor)
    const found = await searchTempo(env.TEMPO_URL, {
      query: traceSearchQuery(input),
      ...window,
      limit: fetchLimit,
    })
    const older = found
      .map(foundTraceOf)
      .filter((trace) => isPastCursor(trace, cursor))
      .sort(newestFirst)
    const page = older.slice(0, input.limit)
    // A full fetch may have left older traces out, even when the drop of
    // the cursor's second leaves this page short.
    const hasMore = older.length > input.limit || found.length >= fetchLimit
    const [database, stream] = await Promise.all([
      searchMatchingIds(env.TEMPO_URL, window, page, "database"),
      searchMatchingIds(env.TEMPO_URL, window, page, "stream"),
    ])

    return {
      traces: page.map((trace) => toSummary(trace, { database, stream })),
      nextCursor: nextCursorOf(page, hasMore, cursor),
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
