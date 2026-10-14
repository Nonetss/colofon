import type { TraceSpan } from "@/features/admin/traces/shared"

/** Runs of at least this many same-named siblings fold into one row. */
const GROUP_MIN_RUN = 3

/** Rows the waterfall opens by default, level by level, before it stops
 *  expanding: enough to read a trace's shape without scrolling through it. */
const DEFAULT_ROW_BUDGET = 60

/**
 * oRPC's own spans around every procedure call (`call_procedure`,
 * `middleware.<name>`, `validate_input`/`validate_output`, `handler` and the
 * `consume_*` spans of a streamed input or output): they repeat on every call
 * and say nothing about the work, so the waterfall hides them unless asked,
 * lifting their children to the nearest span it shows.
 */
const ORPC_SPAN_NAMES = new Set(["call_procedure", "handler"])
const ORPC_SPAN_PREFIXES = [
  "middleware.",
  "validate_input",
  "validate_output",
  "consume_",
]

/** Whether a span is oRPC plumbing. A failed one never is, so an error is
 *  always on screen. */
export function isInternalSpan(span: TraceSpan): boolean {
  if (span.status === "error") return false
  if (ORPC_SPAN_NAMES.has(span.name)) return true
  return ORPC_SPAN_PREFIXES.some((prefix) => span.name.startsWith(prefix))
}

export interface WaterfallNode {
  span: TraceSpan
  parent: WaterfallNode | null
  /** The group this node sits in among its siblings, if any. */
  groupKey: string | null
  items: WaterfallItem[]
}

export interface WaterfallGroup {
  key: string
  name: string
  service: string
  nodes: WaterfallNode[]
}

export type WaterfallItem =
  | { kind: "node"; node: WaterfallNode }
  | { kind: "group"; group: WaterfallGroup }

export interface WaterfallTree {
  items: WaterfallItem[]
  nodes: WaterfallNode[]
  /** Spans left out as oRPC plumbing. */
  hiddenCount: number
}

/** A stretch of a row's bar where spans of one service ran: what a folded
 *  row paints so the services inside it keep their color. */
export interface BarSegment {
  service: string
  failed: boolean
  offsetMs: number
  durationMs: number
}

export type WaterfallRow =
  | {
      kind: "span"
      key: string
      depth: number
      span: TraceSpan
      expandable: boolean
      expanded: boolean
      /** Folded: where the spans under it of other services (or in error)
       *  ran, over its own bar. Empty when open or a leaf. */
      segments: BarSegment[]
    }
  | {
      kind: "group"
      key: string
      depth: number
      name: string
      service: string
      spans: TraceSpan[]
      /** Sum of the members' durations. */
      totalMs: number
      /** From the first member's start to the last one's end. */
      bar: TraceSpan["bar"]
      /** Where the members ran, and while folded what ran under them. */
      segments: BarSegment[]
      errorCount: number
      expanded: boolean
    }

export function groupKeyOf(span: TraceSpan): string {
  return `group:${span.spanId}`
}

/** Folds runs of consecutive siblings with the same name and service. */
function groupSiblings(nodes: readonly WaterfallNode[]): WaterfallItem[] {
  const runs: { head: TraceSpan; nodes: WaterfallNode[] }[] = []
  for (const node of nodes) {
    const run = runs.at(-1)
    if (
      run !== undefined &&
      run.head.name === node.span.name &&
      run.head.service === node.span.service
    ) {
      run.nodes.push(node)
      continue
    }
    runs.push({ head: node.span, nodes: [node] })
  }

  const items: WaterfallItem[] = []
  for (const run of runs) {
    if (run.nodes.length < GROUP_MIN_RUN) {
      for (const node of run.nodes) items.push({ kind: "node", node })
      continue
    }
    const key = groupKeyOf(run.head)
    for (const node of run.nodes) node.groupKey = key
    items.push({
      kind: "group",
      group: {
        key,
        name: run.head.name,
        service: run.head.service,
        nodes: run.nodes,
      },
    })
  }
  return items
}

/**
 * The spans of `traces.get` (depth-first, siblings by start time) as a tree
 * of rows: oRPC plumbing left out unless `showInternal`, with its children
 * attached to the nearest span kept, and runs of same-named siblings folded
 * into groups. A span whose parent isn't in the trace is a root.
 */
export function buildWaterfallTree(
  spans: readonly TraceSpan[],
  { showInternal }: { showInternal: boolean }
): WaterfallTree {
  const roots: WaterfallNode[] = []
  const nodes: WaterfallNode[] = []
  const childrenOf = new Map<WaterfallNode, WaterfallNode[]>()
  // Where a span's children go: its own node, or for a hidden span the node
  // its own children are lifted to (null for the top level).
  const receiverOf = new Map<string, WaterfallNode | null>()
  let hiddenCount = 0

  for (const span of spans) {
    const receiver = receiverFor(span, receiverOf)
    if (!showInternal && isInternalSpan(span)) {
      hiddenCount += 1
      receiverOf.set(span.spanId, receiver)
      continue
    }
    const node: WaterfallNode = {
      span,
      parent: receiver,
      groupKey: null,
      items: [],
    }
    nodes.push(node)
    receiverOf.set(span.spanId, node)
    if (receiver === null) {
      roots.push(node)
      continue
    }
    const siblings = childrenOf.get(receiver)
    if (siblings) siblings.push(node)
    else childrenOf.set(receiver, [node])
  }

  for (const [parent, children] of childrenOf) {
    parent.items = groupSiblings(children)
  }
  return { items: groupSiblings(roots), nodes, hiddenCount }
}

function receiverFor(
  span: TraceSpan,
  receiverOf: ReadonlyMap<string, WaterfallNode | null>
): WaterfallNode | null {
  if (span.parentSpanId === null) return null
  const receiver = receiverOf.get(span.parentSpanId)
  if (receiver === undefined) return null
  return receiver
}

/**
 * What the waterfall opens before the user touches it: the roots, then
 * level by level every span whose children still fit in the row budget, so
 * a large trace opens on its outline. Groups stay folded. Every span in
 * error is revealed, with whatever groups and spans enclose it.
 */
export function defaultExpandedKeys(tree: WaterfallTree): Set<string> {
  const expanded = new Set<string>()
  let rows = tree.items.length
  let level: WaterfallNode[] = []

  for (const item of tree.items) {
    if (item.kind !== "node" || item.node.items.length === 0) continue
    expanded.add(item.node.span.spanId)
    rows += item.node.items.length
    level.push(item.node)
  }

  while (level.length > 0) {
    const next: WaterfallNode[] = []
    for (const parent of level) {
      for (const item of parent.items) {
        if (item.kind !== "node" || item.node.items.length === 0) continue
        const added = item.node.items.length
        if (rows + added > DEFAULT_ROW_BUDGET) continue
        expanded.add(item.node.span.spanId)
        rows += added
        next.push(item.node)
      }
    }
    level = next
  }

  for (const node of tree.nodes) {
    if (node.span.status === "error") revealNode(node, expanded)
  }
  return expanded
}

/** Opens every span and group that encloses `node`. */
function revealNode(node: WaterfallNode, expanded: Set<string>): void {
  let current: WaterfallNode | null = node
  while (current !== null) {
    if (current.groupKey !== null) expanded.add(current.groupKey)
    if (current.parent !== null) expanded.add(current.parent.span.spanId)
    current = current.parent
  }
}

/** Every key the waterfall can open: spans with children and groups. */
export function expandableKeys(tree: WaterfallTree): string[] {
  const keys: string[] = []
  for (const node of tree.nodes) {
    if (node.items.length > 0) keys.push(node.span.spanId)
    for (const item of node.items) {
      if (item.kind === "group") keys.push(item.group.key)
    }
  }
  for (const item of tree.items) {
    if (item.kind === "group") keys.push(item.group.key)
  }
  return keys
}

/** Every span under `node`, through its groups. */
function collectDescendants(node: WaterfallNode, into: TraceSpan[]): void {
  for (const item of node.items) {
    const children = item.kind === "node" ? [item.node] : item.group.nodes
    for (const child of children) {
      into.push(child.span)
      collectDescendants(child, into)
    }
  }
}

/**
 * The bars of `spans` merged per service (spans in error apart), joining
 * stretches closer than `gapMs`, so hundreds of queries paint as a few
 * segments. Errors come last, drawn on top.
 */
export function mergeSegments(
  spans: readonly TraceSpan[],
  gapMs: number
): BarSegment[] {
  const byKey = new Map<string, TraceSpan[]>()
  for (const span of spans) {
    const key = segmentKeyOf(span)
    const list = byKey.get(key)
    if (list) list.push(span)
    else byKey.set(key, [span])
  }

  const segments: BarSegment[] = []
  const errors: BarSegment[] = []
  for (const list of byKey.values()) {
    const sorted = [...list].sort((a, b) => a.bar.offsetMs - b.bar.offsetMs)
    const merged: BarSegment[] = []
    for (const span of sorted) {
      const end = span.bar.offsetMs + span.bar.durationMs
      const last = merged.at(-1)
      if (
        last !== undefined &&
        span.bar.offsetMs <= last.offsetMs + last.durationMs + gapMs
      ) {
        last.durationMs = Math.max(last.durationMs, end - last.offsetMs)
        continue
      }
      merged.push({
        service: span.service,
        failed: span.status === "error",
        offsetMs: span.bar.offsetMs,
        durationMs: span.bar.durationMs,
      })
    }
    for (const segment of merged) {
      if (segment.failed) errors.push(segment)
      else segments.push(segment)
    }
  }
  return [...segments, ...errors]
}

function segmentKeyOf(span: TraceSpan): string {
  if (span.status === "error") return "error"
  return `service:${span.service}`
}

function foldedSegments(node: WaterfallNode, gapMs: number): BarSegment[] {
  const descendants: TraceSpan[] = []
  collectDescendants(node, descendants)
  const shown = descendants.filter(
    (span) => span.status === "error" || span.service !== node.span.service
  )
  return mergeSegments(shown, gapMs)
}

function groupRow(
  group: WaterfallGroup,
  depth: number,
  expanded: boolean,
  gapMs: number
): WaterfallRow {
  const spans = group.nodes.map((node) => node.span)
  const painted = [...spans]
  if (!expanded) {
    for (const node of group.nodes) collectDescendants(node, painted)
  }
  const start = Math.min(...spans.map((span) => span.bar.offsetMs))
  const end = Math.max(
    ...spans.map((span) => span.bar.offsetMs + span.bar.durationMs)
  )
  return {
    kind: "group",
    key: group.key,
    depth,
    name: group.name,
    service: group.service,
    spans,
    totalMs: spans.reduce((total, span) => total + span.durationMs, 0),
    bar: {
      offsetMs: start,
      durationMs: end - start,
      continues: spans.some((span) => span.bar.continues),
    },
    segments: mergeSegments(painted, gapMs),
    errorCount: spans.filter((span) => span.status === "error").length,
    expanded,
  }
}

/** The rows on screen: the tree flattened, skipping what is folded.
 *  `gapMs` is how close two stretches of a folded row's bar must be to
 *  paint as one. */
export function waterfallRows(
  tree: WaterfallTree,
  isExpanded: (key: string) => boolean,
  { gapMs }: { gapMs: number }
): WaterfallRow[] {
  const rows: WaterfallRow[] = []

  const pushNode = (node: WaterfallNode, depth: number) => {
    const expandable = node.items.length > 0
    const expanded = expandable && isExpanded(node.span.spanId)
    const segments = expandable && !expanded ? foldedSegments(node, gapMs) : []
    rows.push({
      kind: "span",
      key: node.span.spanId,
      depth,
      span: node.span,
      expandable,
      expanded,
      segments,
    })
    if (expanded) pushItems(node.items, depth + 1)
  }

  const pushItems = (items: readonly WaterfallItem[], depth: number) => {
    for (const item of items) {
      if (item.kind === "node") {
        pushNode(item.node, depth)
        continue
      }
      const expanded = isExpanded(item.group.key)
      rows.push(groupRow(item.group, depth, expanded, gapMs))
      if (!expanded) continue
      for (const node of item.group.nodes) pushNode(node, depth + 1)
    }
  }

  pushItems(tree.items, 0)
  return rows
}
