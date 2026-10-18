import type { Element, Properties } from "hast"
import { textWidth } from "#diagrams/measure"
import type { DiagramEdge, Point } from "#diagrams/model"
import type { Anchor, Head } from "#diagrams/schema"
import { cls, element, hued, n, P, rect, textAt } from "#diagrams/svg/elements"

// The arrows of a drawn diagram: the line along its points (right angles
// with rounded corners, or a curve), its head, its label and its hit area.

/** A marker 8×6 at refX 7 on a 1.2 stroke, as `lib.mjs` draws its heads. */
const HEAD = { length: 9.6, half: 3.6, past: 1.2 }

/** The UML heads: a hollow triangle, and a diamond twice as long as wide. */
const TRIANGLE = { length: 12, half: 6, past: 0 }
const DIAMOND = { length: 16, half: 5, past: 0 }

/** The attributes that tie an arrow's parts to its ends, `null` unlinked. */
export function endsOf(edge: DiagramEdge): Properties | null {
  if (edge.from === null && edge.to === null && edge.toZone === null)
    return null
  const ends: Properties = { dataEdge: String(edge.index) }
  if (edge.from !== null) ends.dataFrom = edge.from
  if (edge.to !== null) ends.dataTo = edge.to
  if (edge.toZone !== null) ends.dataToZone = edge.toZone
  return ends
}

function edgeClasses(
  edge: Pick<DiagramEdge, "kind" | "hue">,
  base: string
): string[] {
  if (edge.kind !== "default") return cls(base, `${base}-${edge.kind}`)
  return [...cls(base), ...hued(edge.hue)]
}

/** The line along its points (rounded corners, or a curve), then its head. */
export function edgeLine(
  edge: DiagramEdge,
  points: readonly Point[]
): Element[] {
  const ends = endsOf(edge) ?? {}
  const line = element("path", {
    className: edgeClasses(edge, "edge"),
    ...ends,
    d: routePath(edge, points),
  })
  if (edge.noHead) return [line]
  const head = headPath(edge.head, lastLeg(edge, points))
  if (head === null) return [line]
  const className = edgeClasses(edge, "head")
  if (edge.head === "triangle" || edge.head === "open-diamond")
    className.push(`${P}head-hollow`)
  return [line, element("path", { className, ...ends, d: head })]
}

function routePath(edge: DiagramEdge, points: readonly Point[]): string {
  if (edge.route === "curve") return curvePath(points)
  return roundedPath(points)
}

/** The two points the head points along: the last segment's, or the curve's tangent. */
function lastLeg(edge: DiagramEdge, points: readonly Point[]): Point[] {
  const end = points.at(-1)
  if (edge.route !== "curve" || end === undefined || points.length < 3)
    return points.slice(-2)
  const [, , control] = curveSegments(points).at(-1) ?? []
  if (control === undefined) return points.slice(-2)
  return [control, end]
}

/**
 * The Catmull-Rom curve through `points` as cubic Bézier segments: for
 * each segment its start, its two control points and its end.
 */
function curveSegments(points: readonly Point[]): Point[][] {
  const segments: Point[][] = []
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i]
    const p2 = points[i + 1]
    if (p1 === undefined || p2 === undefined) continue
    const p0 = points[i - 1] ?? p1
    const p3 = points[i + 2] ?? p2
    segments.push([
      p1,
      [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6],
      [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6],
      p2,
    ])
  }
  return segments
}

/** `M … C …` through `points`, a smooth curve. */
function curvePath(points: readonly Point[]): string {
  const [first] = points
  if (first === undefined) return ""
  const parts = [`M${n(first[0])} ${n(first[1])}`]
  for (const [, a, b, end] of curveSegments(points)) {
    if (a === undefined || b === undefined || end === undefined) continue
    parts.push(
      `C${n(a[0])} ${n(a[1])} ${n(b[0])} ${n(b[1])} ${n(end[0])} ${n(end[1])}`
    )
  }
  return parts.join(" ")
}

function headPath(head: Head, leg: readonly Point[]): string | null {
  if (head === "triangle") return arrowHead(leg, TRIANGLE)
  if (head === "diamond" || head === "open-diamond") return diamondHead(leg)
  return arrowHead(leg, HEAD)
}

/** A wider invisible line along the arrow, where the pointer catches it. */
export function hitOf(
  edge: DiagramEdge,
  points: readonly Point[],
  ends: Properties
): Element {
  const data: Properties = { ...ends }
  if (edge.label !== null) data.dataLabel = edge.label
  if (edge.info !== null) data.dataInfo = edge.info
  return element("path", {
    className: cls("hit"),
    ...data,
    d: routePath(edge, points),
  })
}

/** A label centred on `at` (its baseline) with an opaque mask behind. */
export function edgeLabel(
  edge: DiagramEdge,
  label: string,
  at: Point,
  ends: Properties | null
): Element {
  const [x, y] = at
  const width = Math.ceil(textWidth(label, 8, "mono", 0.06) + 8)
  const left = labelLeft(x, width, edge.anchor)
  const textClass = cls("label")
  if (edge.kind === "accent") textClass.push(`${P}label-accent`)
  textClass.push(...hued(edge.hue))
  const parts = [
    rect(cls("mask"), left, y - 9, width, 12, 2),
    textAt(textClass, x, y, label, edge.anchor),
  ]
  return element("g", { className: cls("edge-label"), ...(ends ?? {}) }, parts)
}

export function labelLeft(x: number, width: number, anchor: Anchor): number {
  if (anchor === "middle") return x - width / 2
  if (anchor === "start") return x - 4
  return x - width + 4
}

/** `M a L b …` with the corners rounded by 8, for right-angle routes. */
function roundedPath(points: readonly Point[]): string {
  const [first] = points
  if (first === undefined) return ""
  const parts = [`M${n(first[0])} ${n(first[1])}`]
  for (let i = 1; i < points.length - 1; i++) {
    const before = points[i - 1]
    const corner = points[i]
    const after = points[i + 1]
    if (before === undefined || corner === undefined || after === undefined)
      continue
    const [px, py] = before
    const [x, y] = corner
    const [nx, ny] = after
    const k = Math.min(
      8,
      Math.hypot(x - px, y - py) / 2,
      Math.hypot(nx - x, ny - y) / 2
    )
    const ax = x - Math.sign(x - px) * k
    const ay = y - Math.sign(y - py) * k
    const bx = x + Math.sign(nx - x) * k
    const by = y + Math.sign(ny - y) * k
    parts.push(`L${n(ax)} ${n(ay)}`, `Q${n(x)} ${n(y)} ${n(bx)} ${n(by)}`)
  }
  const last = points.at(-1)
  if (last !== undefined && points.length > 1)
    parts.push(`L${n(last[0])} ${n(last[1])}`)
  return parts.join(" ")
}

/** The unit direction of the last segment of `points`, and its end. */
function direction(
  points: readonly Point[]
): { end: Point; dx: number; dy: number } | null {
  const end = points.at(-1)
  const before = points.at(-2)
  if (end === undefined || before === undefined) return null
  const length = Math.hypot(end[0] - before[0], end[1] - before[1])
  if (length === 0) return null
  return {
    end,
    dx: (end[0] - before[0]) / length,
    dy: (end[1] - before[1]) / length,
  }
}

/** A triangle at the route's end, pointing along its last segment. */
function arrowHead(
  points: readonly Point[],
  size: { length: number; half: number; past: number }
): string | null {
  const along = direction(points)
  if (along === null) return null
  const { end, dx, dy } = along
  const tipX = end[0] + dx * size.past
  const tipY = end[1] + dy * size.past
  const baseX = tipX - dx * size.length
  const baseY = tipY - dy * size.length
  const sideX = -dy * size.half
  const sideY = dx * size.half
  return [
    `M${n(tipX)} ${n(tipY)}`,
    `L${n(baseX + sideX)} ${n(baseY + sideY)}`,
    `L${n(baseX - sideX)} ${n(baseY - sideY)}`,
    "Z",
  ].join(" ")
}

/** A diamond whose far corner is the route's end, as UML's compositions. */
function diamondHead(points: readonly Point[]): string | null {
  const along = direction(points)
  if (along === null) return null
  const { end, dx, dy } = along
  const mid = DIAMOND.length / 2
  const cx = end[0] - dx * mid
  const cy = end[1] - dy * mid
  return [
    `M${n(end[0])} ${n(end[1])}`,
    `L${n(cx - dy * DIAMOND.half)} ${n(cy + dx * DIAMOND.half)}`,
    `L${n(end[0] - dx * DIAMOND.length)} ${n(end[1] - dy * DIAMOND.length)}`,
    `L${n(cx + dy * DIAMOND.half)} ${n(cy - dx * DIAMOND.half)}`,
    "Z",
  ].join(" ")
}
