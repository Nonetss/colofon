import type { Element, ElementContent, Properties } from "hast"
import { badgeWidth, tagWidth, textWidth } from "#diagrams/measure"
import {
  type BoxShape,
  type Diagram,
  type DiagramBox,
  type DiagramEdge,
  type DiagramRow,
  type DiagramZone,
  type Graphic,
  type LegendEntry,
  type LegendSample,
  type Point,
  TEXT_ROLES,
} from "#diagrams/model"
import {
  type Anchor,
  EDGE_KINDS,
  type EdgeKind,
  type Head,
  type Hue,
  NODE_KINDS,
  type NodeKind,
} from "#diagrams/schema"

// A diagram drawn as an inline SVG with the look of the reference site's
// scheme drawer (`lib.mjs`): tagged boxes, right-angle arrows with a label
// over them, one accent piece, hued zones, badges and a legend strip under
// the drawing. It is hast, so it goes through the same sanitizer as every
// page: no ids, styles or markers (arrowheads are their own paths), and the
// colours and fonts come from the reader's CSS on the `doc-diagram-*`
// classes, so the drawing follows the theme. The `data-*` attributes are
// what the reader's highlighting reads. Content text only ever lands in
// text nodes and attribute values.

const P = "doc-diagram-"

/** What the legend calls each kind of box and arrow, unless told otherwise. */
const KIND_NAMES: Record<NodeKind, string> = {
  focal: "Pieza central",
  service: "Servicio",
  store: "Datos / destino",
  input: "Usuario / origen",
  external: "Externo",
  optional: "Sin uso",
}

const EDGE_NAMES: Record<EdgeKind, string> = {
  default: "Conexión",
  accent: "Camino principal",
  dash: "Opcional / aviso",
}

const BADGE_NAME = "Conexión con una pieza lejana"

/** A marker 8×6 at refX 7 on a 1.2 stroke, as `lib.mjs` draws its heads. */
const HEAD = { length: 9.6, half: 3.6, past: 1.2 }

/** The UML heads: a hollow triangle, and a diamond twice as long as wide. */
const TRIANGLE = { length: 12, half: 6, past: 0 }
const DIAMOND = { length: 16, half: 5, past: 0 }

/** The drawings this wide or wider keep 640px on narrow screens. */
const WIDE = 640

function element(
  tagName: string,
  properties: Properties,
  children: ElementContent[] = []
): Element {
  return { type: "element", tagName, properties, children }
}

function text(value: string): ElementContent {
  return { type: "text", value }
}

/** A coordinate as written in the SVG, to a tenth of a pixel. */
function n(value: number): string {
  return String(Math.round(value * 10) / 10)
}

/** The classes of something tinted by `hue`, none without one. */
function hued(hue: Hue | null): string[] {
  if (hue === null) return []
  return [`${P}hued`, `${P}hue-${hue}`]
}

function cls(...names: string[]): string[] {
  return names.map((name) => `${P}${name}`)
}

/** The drawing of `diagram`, `size` wide and high plus its legend. */
export function diagramSvg(
  diagram: Diagram,
  size: { width: number; height: number },
  routeOf: (pagePath: string) => string
): Element {
  if (diagram.illustration !== null)
    return illustrationSvg(diagram, diagram.illustration, size)
  const byId = new Map<string, DiagramBox>()
  for (const box of diagram.nodes) if (box.id !== null) byId.set(box.id, box)
  const legend = legendOf(diagram, size)
  const parts: ElementContent[] = [
    element("title", {}, [text(diagram.title)]),
    rect(cls("paper"), 0, 0, size.width, legend.height, 0),
  ]
  for (const graphic of diagram.under) parts.push(graphicOf(graphic, routeOf))
  const titles: Element[] = []
  for (const zone of diagram.zones) {
    parts.push(zoneFrame(zone))
    titles.push(zoneTitle(zone))
  }
  const lines: Element[] = []
  const hits: Element[] = []
  const labels: Element[] = []
  for (const edge of diagram.edges) {
    if (edge.points === null) continue
    lines.push(...edgeLine(edge, edge.points))
    const ends = endsOf(edge)
    if (ends !== null) hits.push(hitOf(edge, edge.points, ends))
    if (edge.label !== null && edge.at !== null)
      labels.push(edgeLabel(edge, edge.label, edge.at, ends))
  }
  parts.push(...lines, ...hits, ...titles, ...labels)
  for (const note of diagram.notes)
    parts.push(
      element(
        "text",
        {
          className: cls("note"),
          x: n(note.x),
          y: n(note.y),
          textAnchor: note.anchor,
        },
        [text(note.text)]
      )
    )
  for (const box of diagram.nodes) parts.push(boxOf(box, routeOf))
  for (const box of diagram.nodes)
    parts.push(...badgesOf(box, diagram.edges, byId))
  for (const graphic of diagram.over) parts.push(graphicOf(graphic, routeOf))
  parts.push(...legend.parts)
  const className = [`${P}svg`]
  if (size.width >= WIDE) className.push(`${P}svg-wide`)
  return element(
    "svg",
    {
      className,
      viewBox: `0 0 ${n(size.width)} ${n(legend.height)}`,
      width: n(size.width),
      role: "img",
      ariaLabel: altText(diagram),
    },
    parts
  )
}

/** A hand-drawn diagram: its own drawing, sized and labelled as any other. */
function illustrationSvg(
  diagram: Diagram,
  illustration: { viewBox: string; children: ElementContent[] },
  size: { width: number; height: number }
): Element {
  const className = [`${P}svg`, `${P}illustration`]
  if (size.width >= WIDE) className.push(`${P}svg-wide`)
  return element(
    "svg",
    {
      className,
      viewBox: illustration.viewBox,
      width: n(size.width),
      role: "img",
      ariaLabel: altText(diagram),
    },
    [element("title", {}, [text(diagram.title)]), ...illustration.children]
  )
}

function altText(diagram: Diagram): string {
  if (diagram.description === "") return diagram.title
  return `${diagram.title}. ${diagram.description}`
}

function rect(
  className: string[],
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  data: Properties = {}
): Element {
  return element("rect", {
    className,
    ...data,
    x: n(x),
    y: n(y),
    width: n(width),
    height: n(height),
    rx: n(radius),
  })
}

function textAt(
  className: string[],
  x: number,
  y: number,
  value: string,
  anchor: Anchor = "start"
): Element {
  return element("text", { className, x: n(x), y: n(y), textAnchor: anchor }, [
    text(value),
  ])
}

/** A hairline from (x1, y) to (x2, y). */
function hair(x1: number, x2: number, y: number): Element {
  return element("path", {
    className: cls("hair"),
    d: `M${n(x1)} ${n(y)} H${n(x2)}`,
  })
}

// ── Zones ─────────────────────────────────────────────────────────────────

function zoneData(zone: DiagramZone): Properties {
  if (zone.id === null) return {}
  return { dataZone: zone.id }
}

function zoneFrame(zone: DiagramZone): Element {
  return rect(
    [...cls("zone"), ...hued(zone.hue)],
    zone.x,
    zone.y,
    zone.w,
    zone.h,
    8,
    zoneData(zone)
  )
}

/** Its title on a mask, drawn over the arrows so no line crosses it. */
function zoneTitle(zone: DiagramZone): Element {
  const width = Math.ceil(textWidth(zone.label, 8, "mono", 0.14) + 8)
  return element("g", { className: cls("zone-title"), ...zoneData(zone) }, [
    rect(
      [...cls("mask"), ...hued(zone.hue)],
      zone.x + 8,
      zone.y + 9,
      width,
      12,
      2
    ),
    textAt(
      [...cls("legend"), ...hued(zone.hue)],
      zone.x + 12,
      zone.y + 18,
      zone.label
    ),
  ])
}

// ── Arrows ────────────────────────────────────────────────────────────────

/** The attributes that tie an arrow's parts to its ends, `null` unlinked. */
function endsOf(edge: DiagramEdge): Properties | null {
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
function edgeLine(edge: DiagramEdge, points: readonly Point[]): Element[] {
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
function hitOf(
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
function edgeLabel(
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

function labelLeft(x: number, width: number, anchor: Anchor): number {
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

// ── Boxes ─────────────────────────────────────────────────────────────────

/**
 * A box, wrapped with what the reader's highlighting reads: its id, zone,
 * `trace`, `needs` and `info`; a link to its page when it has one.
 */
function boxOf(
  box: DiagramBox,
  routeOf: (pagePath: string) => string
): Element {
  const body = box.rows === null ? plainBox(box) : tableBox(box, box.rows)
  const data: Properties = {}
  if (box.id !== null) data.dataNode = box.id
  if (box.zone !== null) data.dataZone = box.zone
  if (box.trace) data.dataTrace = "true"
  if (box.needs.length > 0) data.dataNeeds = box.needs.join(" ")
  if (box.info !== null) data.dataInfo = box.info
  if (box.link === null)
    return element(
      "g",
      { className: [`${P}box`, ...hued(box.hue)], ...data },
      body
    )
  return element(
    "a",
    {
      className: [`${P}box`, `${P}link`, ...hued(box.hue)],
      href: routeOf(box.link),
      ...data,
    },
    body
  )
}

/** A rounded box, or the outline its shape names. */
function outline(
  className: string[],
  x: number,
  y: number,
  w: number,
  h: number,
  shape: BoxShape | null,
  rim: boolean
): Element[] {
  if (shape === "pill") return [rect(className, x, y, w, h, h / 2)]
  if (shape === "rounded") return [rect(className, x, y, w, h, h / 3)]
  if (shape === "diamond")
    return [
      element("path", {
        className,
        d: `M${n(x + w / 2)} ${n(y)} L${n(x + w)} ${n(y + h / 2)} L${n(x + w / 2)} ${n(y + h)} L${n(x)} ${n(y + h / 2)} Z`,
      }),
    ]
  if (shape === "parallelogram") {
    const slant = Math.min(16, w / 6)
    return [
      element("path", {
        className,
        d: `M${n(x + slant)} ${n(y)} H${n(x + w)} L${n(x + w - slant)} ${n(y + h)} H${n(x)} Z`,
      }),
    ]
  }
  if (shape === "circle")
    return [
      element("circle", {
        className,
        cx: n(x + w / 2),
        cy: n(y + h / 2),
        r: n(Math.min(w, h) / 2),
      }),
    ]
  if (shape === "cylinder") {
    const r = Math.min(7, h / 4)
    const rx = w / 2
    const body = element("path", {
      className,
      d: `M${n(x)} ${n(y + r)} A${n(rx)} ${n(r)} 0 0 1 ${n(x + w)} ${n(y + r)} V${n(y + h - r)} A${n(rx)} ${n(r)} 0 0 1 ${n(x)} ${n(y + h - r)} Z`,
    })
    if (!rim) return [body]
    return [
      body,
      element("path", {
        className: [...className, `${P}rim`],
        d: `M${n(x)} ${n(y + r)} A${n(rx)} ${n(r)} 0 0 0 ${n(x + w)} ${n(y + r)}`,
      }),
    ]
  }
  return [rect(className, x, y, w, h, 6)]
}

function nodeClasses(kind: NodeKind): string[] {
  return cls("node", kind)
}

/** A framed tag: its box and its text, in capitals. */
function tagOf(tag: string, kind: NodeKind, x: number, y: number): Element[] {
  const width = tagWidth(tag)
  const focal = kind === "focal"
  const box = cls("tagbox")
  const label = cls("tag")
  if (focal) {
    box.push(`${P}tagbox-focal`)
    label.push(`${P}tag-focal`)
  }
  return [
    rect(box, x, y, width, 12, 2),
    textAt(label, x + width / 2, y + 9, tag.toUpperCase(), "middle"),
  ]
}

/** Where a box's tag sits: on its top row, or over the name inside a shape that narrows. */
function tagTop(box: DiagramBox, nameY: number): number {
  if (box.shape === "cylinder") return box.y + 16
  if (box.shape === "diamond" || box.shape === "circle") return nameY - 26
  return box.y + 6
}

function plainBox(box: DiagramBox): Element[] {
  const { x, y, w, h, shape } = box
  const cx = x + w / 2
  const cylinder = shape === "cylinder"
  const tagRow = box.tag === null ? 0 : 18
  const cylinderTop = cylinder ? 8 : 0
  const top = tagRow + cylinderTop
  const block = 12 + 15 * box.sub.length
  const nameY = y + top + (h - top - block) / 2 + 10
  const parts: Element[] = [
    ...outline(cls("paper"), x, y, w, h, shape, false),
    ...outline(nodeClasses(box.kind), x, y, w, h, shape, true),
  ]
  if (box.tag !== null) {
    // Centred on any shape, at the left on a box.
    const tx = shape === null ? x + 8 : cx - tagWidth(box.tag) / 2
    parts.push(...tagOf(box.tag, box.kind, tx, tagTop(box, nameY)))
  }
  parts.push(textAt(cls("name"), cx, nameY, box.name, "middle"))
  box.sub.forEach((line, index) => {
    parts.push(textAt(cls("sub"), cx, nameY + 15 * (index + 1), line, "middle"))
  })
  return parts
}

/**
 * A database table: name on top, a hairline, then one row per column with
 * its key, name and type, and its "more" line.
 */
function tableBox(box: DiagramBox, rows: readonly DiagramRow[]): Element[] {
  const { x, y, w, h } = box
  const parts: Element[] = [
    rect(cls("paper"), x, y, w, h, 6),
    rect(nodeClasses(box.kind), x, y, w, h, 6),
    textAt(cls("table-name"), x + 12, y + 20, box.name),
    hair(x, x + w, y + 30),
  ]
  if (box.tag !== null)
    parts.push(
      ...tagOf(box.tag, box.kind, x + w - 8 - tagWidth(box.tag), y + 9)
    )
  rows.forEach((row, index) => {
    const ry = y + 46 + 14 * index
    if (row.key !== null) {
      const key = cls("key")
      if (row.key === "PK") key.push(`${P}key-pk`)
      parts.push(textAt(key, x + 12, ry, row.key))
    }
    parts.push(textAt(cls("col"), x + 40, ry, row.name))
    if (row.type !== null)
      parts.push(textAt(cls("type"), x + w - 12, ry, row.type, "end"))
  })
  const moreRow = box.more === null ? 0 : 14
  if (box.more !== null)
    parts.push(textAt(cls("more"), x + 12, y + 46 + 14 * rows.length, box.more))
  if (box.ops !== null && box.ops.length > 0) {
    const top = y + 36 + 14 * rows.length + moreRow
    parts.push(hair(x, x + w, top))
    box.ops.forEach((op, index) => {
      const ry = top + 20 + 14 * index
      if (op.key !== null) parts.push(textAt(cls("key"), x + 12, ry, op.key))
      parts.push(textAt(cls("col"), x + 40, ry, op.name))
      if (op.type !== null)
        parts.push(textAt(cls("type"), x + w - 12, ry, op.type, "end"))
    })
  }
  return parts
}

/**
 * The chips of the badge arrows that leave `box`: a pill each, in the hue
 * of the box they go to, from its top right corner leftwards.
 */
function badgesOf(
  box: DiagramBox,
  edges: readonly DiagramEdge[],
  byId: ReadonlyMap<string, DiagramBox>
): Element[] {
  if (box.id === null) return []
  let right = box.x + box.w - 8
  const chips: Element[] = []
  for (const edge of edges) {
    if (edge.badge === null || edge.from !== box.id || edge.to === null)
      continue
    const width = badgeWidth(edge.badge)
    const left = right - width
    const hue = byId.get(edge.to)?.hue ?? null
    const data: Properties = {
      dataEdge: String(edge.index),
      dataFrom: edge.from,
      dataTo: edge.to,
      dataLabel: chipLabel(edge, edge.badge),
    }
    if (edge.info !== null) data.dataInfo = edge.info
    chips.push(
      element("g", { className: [`${P}badge`, ...hued(hue)], ...data }, [
        rect([`${P}badge-box`, ...hued(hue)], left, box.y + 6, width, 12, 6),
        textAt(
          [`${P}badge-t`, ...hued(hue)],
          left + width / 2,
          box.y + 15,
          edge.badge,
          "middle"
        ),
      ])
    )
    right = left - 3
  }
  return chips
}

function chipLabel(edge: DiagramEdge, badge: string): string {
  if (edge.label !== null) return edge.label
  return badge
}

// ── Legend ────────────────────────────────────────────────────────────────

type LegendItem = {
  name: string
  mark: number
  draw: (x: number, y: number) => Element[]
  /** Hovering the entry lights the marks of this series. */
  series?: string
}

function legendSample(
  kind: NodeKind,
  shape: BoxShape | undefined
): LegendItem["draw"] {
  if (shape === undefined)
    return (x, y) => [rect(nodeClasses(kind), x, y - 6, 20, 12, 3)]
  return (x, y) => outline(nodeClasses(kind), x, y - 7, 20, 14, shape, true)
}

function edgeSample(kind: EdgeKind, head: Head = "arrow"): LegendItem["draw"] {
  return (x, y) => {
    const edge: DiagramEdge = {
      index: -1,
      points: null,
      from: null,
      to: null,
      toZone: null,
      kind,
      label: null,
      at: null,
      anchor: "middle",
      hue: null,
      info: null,
      noHead: false,
      head,
      route: "orthogonal",
      badge: null,
    }
    return edgeLine(edge, [
      [x, y],
      [x + 30, y],
    ])
  }
}

function badgeSample(x: number, y: number): Element[] {
  const width = badgeWidth("SSO")
  return [
    rect([`${P}badge-box`], x, y - 6, width, 12, 6),
    textAt([`${P}badge-t`], x + width / 2, y + 3, "SSO", "middle"),
  ]
}

/**
 * The legend strip under the drawing: a hairline, "LEYENDA" and only the
 * kinds of box and arrow the diagram uses, plus the badges, wrapping onto
 * more rows when they do not fit the width.
 */
function legendOf(
  diagram: Diagram,
  size: { width: number; height: number }
): { height: number; parts: Element[] } {
  if (diagram.legend !== null) {
    if (diagram.legend.length === 0) return { height: size.height, parts: [] }
    return legendStrip(typedLegend(diagram.legend), size)
  }
  const kinds = new Set(diagram.nodes.map((box) => box.kind))
  const lines = diagram.edges.filter((edge) => edge.badge === null)
  const edgeKinds = new Set(lines.map((edge) => edge.kind))
  const items: LegendItem[] = []
  for (const kind of NODE_KINDS) {
    if (!kinds.has(kind)) continue
    items.push({
      name: kindName(diagram, kind),
      mark: 28,
      draw: legendSample(kind, diagram.shapes[kind]),
    })
  }
  for (const kind of EDGE_KINDS) {
    if (!edgeKinds.has(kind)) continue
    items.push({
      name: edgeName(diagram, kind),
      mark: 40,
      draw: edgeSample(kind),
    })
  }
  if (diagram.edges.some((edge) => edge.badge !== null))
    items.push({
      name: badgeName(diagram.badgeName),
      mark: badgeWidth("SSO") + 8,
      draw: badgeSample,
    })
  return legendStrip(items, size)
}

/**
 * The strip under the drawing, a hairline and "LEYENDA" before `items`;
 * a typed form's drawing with no items has no strip.
 */
function legendStrip(
  items: readonly LegendItem[],
  size: { width: number; height: number }
): { height: number; parts: Element[] } {
  const legendY = size.height + 28
  const parts: Element[] = [
    hair(24, size.width - 24, legendY - 16),
    textAt(cls("legend"), 24, legendY + 4, "LEYENDA"),
  ]
  let x = 96
  let y = legendY
  for (const item of items) {
    const width = item.mark + Math.ceil(textWidth(item.name, 11, "sans", -0.06))
    if (x > 96 && x + width > size.width - 24) {
      x = 96
      y += 22
    }
    const drawn = [
      ...item.draw(x, y),
      textAt(cls("legend-item"), x + item.mark, y + 4, item.name),
    ]
    if (item.series === undefined) parts.push(...drawn)
    else
      parts.push(
        element(
          "g",
          { className: cls("legend-entry"), dataSeries: item.series },
          drawn
        )
      )
    x += width + 20
  }
  return { height: y + 32, parts }
}

function kindName(diagram: Diagram, kind: NodeKind): string {
  const own = diagram.kindNames[kind]
  if (own !== undefined) return own
  return KIND_NAMES[kind]
}

function edgeName(diagram: Diagram, kind: EdgeKind): string {
  const own = diagram.edgeNames[kind]
  if (own !== undefined) return own
  return EDGE_NAMES[kind]
}

function badgeName(own: string | null): string {
  if (own !== null) return own
  return BADGE_NAME
}

/** A typed form's legend entries as strip items. */
function typedLegend(entries: readonly LegendEntry[]): LegendItem[] {
  return entries.map((entry) => {
    const item: LegendItem = {
      name: entry.name,
      mark: sampleWidth(entry.sample),
      draw: sampleDraw(entry.sample),
    }
    if (entry.series !== null) item.series = entry.series
    return item
  })
}

function sampleWidth(sample: LegendSample): number {
  if (sample.kind === "edge" || sample.kind === "line") return 40
  if (sample.kind === "dot") return 18
  return 28
}

function sampleDraw(sample: LegendSample): LegendItem["draw"] {
  if (sample.kind === "node")
    return legendSample(sample.node, sample.shape ?? undefined)
  if (sample.kind === "edge") return edgeSample(sample.edge, sample.head)
  if (sample.kind === "swatch")
    return (x, y) => [
      rect(
        [...cls(...sample.classes), ...hued(sample.hue)],
        x,
        y - 4,
        16,
        8,
        1,
        swatchOpacity(sample.opacity)
      ),
    ]
  if (sample.kind === "dot")
    return (x, y) => [
      element("circle", {
        className: [...cls(...sample.classes), ...hued(sample.hue)],
        cx: n(x + 5),
        cy: n(y),
        r: "4",
      }),
    ]
  return (x, y) => [
    element("path", {
      className: [...cls(...sample.classes), ...hued(sample.hue)],
      d: `M${n(x)} ${n(y)} H${n(x + 30)}`,
    }),
  ]
}

// ── A typed form's shapes ─────────────────────────────────────────────────

/**
 * A shape of a typed form, painted by its classes and hue; a data mark
 * carries what the reader's highlighting reads, a linked one is a link.
 */
function graphicOf(
  graphic: Graphic,
  routeOf: (pagePath: string) => string
): Element {
  const className = [...cls(...graphic.classes), ...hued(graphic.hue)]
  const data: Properties = {}
  if (graphic.opacity !== null) data.fillOpacity = n(graphic.opacity)
  if (graphic.datum !== null) {
    className.push(`${P}mark`)
    data.dataNode = graphic.datum.id
    data.dataLabel = graphic.datum.label
    data.dataValue = graphic.datum.value
    if (graphic.datum.series !== null) data.dataSeries = graphic.datum.series
    if (graphic.datum.info !== null) data.dataInfo = graphic.datum.info
  }
  const shape = shapeOf(graphic, className, data)
  if (graphic.link === null) return shape
  return element(
    "a",
    { className: [`${P}link`], href: routeOf(graphic.link) },
    [shape]
  )
}

function shapeOf(
  graphic: Graphic,
  className: string[],
  data: Properties
): Element {
  if (graphic.kind === "rect")
    return rect(
      className,
      graphic.x,
      graphic.y,
      graphic.w,
      graphic.h,
      graphic.r,
      data
    )
  if (graphic.kind === "circle")
    return element("circle", {
      className,
      ...data,
      cx: n(graphic.cx),
      cy: n(graphic.cy),
      r: n(graphic.r),
    })
  if (graphic.kind === "path")
    return element("path", { className, ...data, d: graphic.d })
  if (graphic.kind === "polygon")
    return element("polygon", {
      className,
      ...data,
      points: graphic.points.map(([x, y]) => `${n(x)},${n(y)}`).join(" "),
    })
  if (graphic.kind === "line")
    return element("path", {
      className,
      ...data,
      d: `M${n(graphic.x1)} ${n(graphic.y1)} L${n(graphic.x2)} ${n(graphic.y2)}`,
    })
  const label = element(
    "text",
    {
      className: [...cls(graphic.role), ...className],
      ...data,
      x: n(graphic.x),
      y: n(graphic.y),
      textAnchor: graphic.anchor,
    },
    [text(graphic.text)]
  )
  if (!graphic.mask) return label
  const face = TEXT_ROLES[graphic.role]
  const width = Math.ceil(
    textWidth(graphic.text, face.size, face.font, face.tracking) + 8
  )
  return element("g", {}, [
    rect(
      cls("mask"),
      labelLeft(graphic.x, width, graphic.anchor),
      graphic.y - face.size - 1,
      width,
      face.size + 4,
      2
    ),
    label,
  ])
}

function swatchOpacity(opacity: number | undefined): Properties {
  if (opacity === undefined) return {}
  return { fillOpacity: n(opacity) }
}
