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

/** Escapes a value for a TraceQL double-quoted string. */
function escapeTraceQLString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')
}

/** Escapes RE2 metacharacters, so the text matches literally. */
function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/**
 * One spanset filter ANDing every given condition. Each value goes through
 * `escapeTraceQLString`, so a filter can only ever be compared, never change
 * the query's structure.
 */
export function buildTraceQL(input: SearchInput): string {
  const conditions: string[] = []
  if (input.service !== undefined) {
    conditions.push(
      `trace:rootService = "${escapeTraceQLString(input.service)}"`
    )
  }
  if (input.errorsOnly) conditions.push("status = error")
  if (input.minDurationMs !== undefined) {
    conditions.push(`trace:duration >= ${input.minDurationMs}ms`)
  }
  if (input.name !== undefined) {
    const pattern = `(?i).*${escapeRegex(input.name)}.*`
    conditions.push(`trace:rootName =~ "${escapeTraceQLString(pattern)}"`)
  }
  if (conditions.length === 0) return "{ }"
  return `{ ${conditions.join(" && ")} }`
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

function toSummary(trace: TempoSearchTrace) {
  return {
    traceId: toHexId(trace.traceID, 16),
    rootService: trace.rootServiceName ?? "",
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

function toTraceSpan(
  node: LayoutNode,
  depth: number,
  traceStart: bigint
): TraceSpan {
  const { span, service } = node.entry
  return {
    spanId: node.id,
    parentSpanId: parentIdOf(node, depth),
    name: span.name,
    service,
    kind: kindOf(span.kind),
    depth,
    offsetMs: msBetween(traceStart, node.start),
    durationMs: msBetween(node.start, nanos(span.endTimeUnixNano)),
    status: statusOf(span),
    statusMessage: statusMessageOf(span),
    attributes: attributesOf(span.attributes),
    events: (span.events ?? []).map((event) => ({
      name: event.name,
      offsetMs: msBetween(traceStart, nanos(event.timeUnixNano)),
      attributes: attributesOf(event.attributes),
    })),
  }
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

    const traces = await searchTempo(env.TEMPO_URL, {
      query: buildTraceQL(input),
      ...searchWindow(input),
      limit: input.limit,
    })

    return {
      traces: [...traces].sort(newestFirst).map(toSummary),
      limitReached: traces.length >= input.limit,
    }
  },

  get: async ({ input }: { input: GetInput }): Promise<GetOutput> => {
    const entries = await fetchTrace(requireTempoUrl(), input.traceId)
    if (entries === null) {
      throw errors.NOT_FOUND({ message: "Traza no encontrada" })
    }

    const { start, end } = traceBounds(entries)
    const ordered = layoutSpans(entries)
    const errorCount = entries.filter(
      ({ span }) => span.status?.code === "STATUS_CODE_ERROR"
    ).length

    return {
      traceId: input.traceId,
      startTime: nanosToIso(start),
      durationMs: msBetween(start, end),
      spanCount: entries.length,
      errorCount,
      truncated: ordered.length > MAX_TRACE_SPANS,
      spans: ordered
        .slice(0, MAX_TRACE_SPANS)
        .map(({ node, depth }) => toTraceSpan(node, depth, start)),
    }
  },
}
