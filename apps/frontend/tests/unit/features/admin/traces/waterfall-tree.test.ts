import { describe, expect, test } from "bun:test"
import {
  buildWaterfallTree,
  defaultExpandedKeys,
  groupKeyOf,
  type WaterfallRow,
  waterfallRows,
} from "@/features/admin/traces/detail/model/waterfall-tree"
import type { TraceSpan } from "@/features/admin/traces/shared"

function span(
  spanId: string,
  parentSpanId: string | null,
  overrides: Partial<TraceSpan> = {}
): TraceSpan {
  return {
    spanId,
    parentSpanId,
    name: spanId,
    service: "backend",
    kind: "internal",
    depth: 0,
    offsetMs: 0,
    durationMs: 1,
    bar: { offsetMs: 0, durationMs: 1, continues: false },
    status: "unset",
    statusMessage: null,
    attributes: {},
    events: [],
    ...overrides,
  }
}

function query(spanId: string, parentSpanId: string, offsetMs: number) {
  return span(spanId, parentSpanId, {
    name: "pg.query:UPDATE nonete",
    service: "postgresql",
    durationMs: 2,
    bar: { offsetMs, durationMs: 2, continues: false },
  })
}

function labels(rows: WaterfallRow[]): string[] {
  return rows.map((row) => {
    const indent = "  ".repeat(row.depth)
    if (row.kind === "group") return `${indent}${row.name} ×${row.spans.length}`
    return `${indent}${row.span.name}`
  })
}

const expandAll = () => true
const GAP = { gapMs: 1 }

describe("buildWaterfallTree", () => {
  test("hides oRPC plumbing and lifts its children to the span it shows", () => {
    const tree = buildWaterfallTree(
      [
        span("root", null),
        span("call_procedure", "root"),
        span("middleware.requireAdmin", "root"),
        span("consume_async_iterator_object_output", "root"),
        span("snmp.worker", "consume_async_iterator_object_output"),
      ],
      { showInternal: false }
    )

    expect(tree.hiddenCount).toBe(3)
    expect(labels(waterfallRows(tree, expandAll, GAP))).toEqual([
      "root",
      "  snmp.worker",
    ])
  })

  test("keeps plumbing in error status and everything when asked", () => {
    const spans = [
      span("root", null),
      span("validate_input", "root", { status: "error" }),
      span("handler", "root"),
    ]

    expect(
      labels(
        waterfallRows(
          buildWaterfallTree(spans, { showInternal: false }),
          expandAll,
          GAP
        )
      )
    ).toEqual(["root", "  validate_input"])
    expect(
      labels(
        waterfallRows(
          buildWaterfallTree(spans, { showInternal: true }),
          expandAll,
          GAP
        )
      )
    ).toEqual(["root", "  validate_input", "  handler"])
  })

  test("folds a run of same-named siblings into a group with its count, total and extent", () => {
    const tree = buildWaterfallTree(
      [
        span("persist", null),
        span("begin", "persist"),
        query("q1", "persist", 10),
        query("q2", "persist", 12),
        query("q3", "persist", 20),
        span("commit", "persist"),
      ],
      { showInternal: false }
    )

    const rows = waterfallRows(tree, (key) => key === "persist", GAP)
    expect(labels(rows)).toEqual([
      "persist",
      "  begin",
      "  pg.query:UPDATE nonete ×3",
      "  commit",
    ])
    expect(rows[2]).toMatchObject({
      kind: "group",
      totalMs: 6,
      bar: { offsetMs: 10, durationMs: 12, continues: false },
      expanded: false,
    })
  })

  test("an open group lists its members one level deeper", () => {
    const tree = buildWaterfallTree(
      [
        span("persist", null),
        query("q1", "persist", 0),
        query("q2", "persist", 2),
        query("q3", "persist", 4),
      ],
      { showInternal: false }
    )

    expect(labels(waterfallRows(tree, expandAll, GAP))).toEqual([
      "persist",
      "  pg.query:UPDATE nonete ×3",
      "    pg.query:UPDATE nonete",
      "    pg.query:UPDATE nonete",
      "    pg.query:UPDATE nonete",
    ])
  })

  test("two of a kind stay as separate rows", () => {
    const tree = buildWaterfallTree(
      [
        span("persist", null),
        query("q1", "persist", 0),
        query("q2", "persist", 2),
      ],
      { showInternal: false }
    )

    expect(waterfallRows(tree, expandAll, GAP).map((row) => row.kind)).toEqual([
      "span",
      "span",
      "span",
    ])
  })
})

describe("defaultExpandedKeys", () => {
  test("opens the roots and every level that fits, leaving big subtrees folded", () => {
    const spans = [
      span("root", null),
      span("small", "root"),
      span("leaf", "small"),
    ]
    spans.push(span("big", "root"))
    for (let index = 0; index < 80; index += 1) {
      spans.push(span(`child-${index}`, "big", { name: `child-${index}` }))
    }
    const tree = buildWaterfallTree(spans, { showInternal: false })

    const expanded = defaultExpandedKeys(tree)

    expect(expanded.has("root")).toBe(true)
    expect(expanded.has("small")).toBe(true)
    expect(expanded.has("big")).toBe(false)
  })

  test("reveals a span in error through every folded span and group above it", () => {
    const spans = [span("root", null), span("big", "root")]
    for (let index = 0; index < 80; index += 1) {
      spans.push(span(`child-${index}`, "big", { name: `child-${index}` }))
    }
    spans.push(span("persist", "child-0"))
    const q1 = query("q1", "persist", 0)
    spans.push(q1)
    spans.push(query("q2", "persist", 2))
    spans.push({ ...query("q3", "persist", 4), status: "error" })
    const tree = buildWaterfallTree(spans, { showInternal: false })

    const expanded = defaultExpandedKeys(tree)
    const rows = waterfallRows(tree, (key) => expanded.has(key), GAP)

    expect(expanded.has("big")).toBe(true)
    expect(expanded.has("child-0")).toBe(true)
    expect(expanded.has(groupKeyOf(q1))).toBe(true)
    expect(
      rows.some((row) => row.kind === "span" && row.span.spanId === "q3")
    ).toBe(true)
  })
})

describe("folded rows keep each service's color", () => {
  test("a folded span paints where other services ran under it, merged per service", () => {
    const tree = buildWaterfallTree(
      [
        span("poll", null, {
          bar: { offsetMs: 0, durationMs: 100, continues: false },
        }),
        span("worker", "poll", {
          service: "worker",
          bar: { offsetMs: 10, durationMs: 40, continues: false },
        }),
        span("same", "poll", {
          bar: { offsetMs: 0, durationMs: 5, continues: false },
        }),
        query("q1", "poll", 60),
        query("q2", "poll", 62.5),
        query("q3", "poll", 90),
      ],
      { showInternal: false }
    )

    const [row] = waterfallRows(tree, () => false, GAP)

    expect(row).toMatchObject({
      kind: "span",
      segments: [
        { service: "worker", offsetMs: 10, durationMs: 40 },
        { service: "postgresql", offsetMs: 60, durationMs: 4.5 },
        { service: "postgresql", offsetMs: 90, durationMs: 2 },
      ],
    })
  })

  test("an open span paints only its own bar", () => {
    const tree = buildWaterfallTree(
      [span("poll", null), span("worker", "poll", { service: "worker" })],
      { showInternal: false }
    )

    expect(waterfallRows(tree, expandAll, GAP)[0]).toMatchObject({
      segments: [],
    })
  })

  test("a group paints its members in their color, an error on top", () => {
    const tree = buildWaterfallTree(
      [
        span("persist", null),
        query("q1", "persist", 0),
        { ...query("q2", "persist", 10), status: "error" },
        query("q3", "persist", 20),
      ],
      { showInternal: false }
    )

    const rows = waterfallRows(tree, (key) => key === "persist", GAP)

    expect(rows[1]).toMatchObject({
      kind: "group",
      segments: [
        { service: "postgresql", failed: false, offsetMs: 0, durationMs: 2 },
        { service: "postgresql", failed: false, offsetMs: 20, durationMs: 2 },
        { service: "postgresql", failed: true, offsetMs: 10, durationMs: 2 },
      ],
    })
  })
})
