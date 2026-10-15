import type { Element, ElementContent, Properties } from "hast"
import { badgeWidth, tagWidth, textWidth } from "#pages/diagram-measure"
import {
  type Anchor,
  EDGE_KINDS,
  type EdgeKind,
  type Hue,
  NODE_KINDS,
  type NodeKind,
  type Shape,
} from "#pages/diagram-schema"
import type {
  Diagram,
  DiagramBox,
  DiagramEdge,
  DiagramRow,
  DiagramZone,
  Point,
} from "#pages/diagrams"

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
  const byId = new Map<string, DiagramBox>()
  for (const box of diagram.nodes) if (box.id !== null) byId.set(box.id, box)
  const legend = legendOf(diagram, size)
  const parts: ElementContent[] = [
    element("title", {}, [text(diagram.title)]),
    rect(cls("paper"), 0, 0, size.width, legend.height, 0),
  ]
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

/** The line along its points with rounded corners, then its head. */
function edgeLine(edge: DiagramEdge, points: readonly Point[]): Element[] {
  const ends = endsOf(edge) ?? {}
  const line = element("path", {
    className: edgeClasses(edge, "edge"),
    ...ends,
    d: roundedPath(points),
  })
  if (edge.noHead) return [line]
  const head = arrowHead(points)
  if (head === null) return [line]
  return [
    line,
    element("path", { className: edgeClasses(edge, "head"), ...ends, d: head }),
  ]
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
    d: roundedPath(points),
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

/** A filled triangle at the route's end, pointing along its last segment. */
function arrowHead(points: readonly Point[]): string | null {
  const end = points.at(-1)
  const before = points.at(-2)
  if (end === undefined || before === undefined) return null
  const length = Math.hypot(end[0] - before[0], end[1] - before[1])
  if (length === 0) return null
  const dx = (end[0] - before[0]) / length
  const dy = (end[1] - before[1]) / length
  const tipX = end[0] + dx * HEAD.past
  const tipY = end[1] + dy * HEAD.past
  const baseX = tipX - dx * HEAD.length
  const baseY = tipY - dy * HEAD.length
  const sideX = -dy * HEAD.half
  const sideY = dx * HEAD.half
  return [
    `M${n(tipX)} ${n(tipY)}`,
    `L${n(baseX + sideX)} ${n(baseY + sideY)}`,
    `L${n(baseX - sideX)} ${n(baseY - sideY)}`,
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

/** A rounded box, or a pill or a cylinder by its shape. */
function outline(
  className: string[],
  x: number,
  y: number,
  w: number,
  h: number,
  shape: Shape | null,
  rim: boolean
): Element[] {
  if (shape === "pill") return [rect(className, x, y, w, h, h / 2)]
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
    // Centred on a pill or a cylinder, at the left on a box.
    const tx = shape === null ? x + 8 : cx - tagWidth(box.tag) / 2
    const ty = cylinder ? y + 16 : y + 6
    parts.push(...tagOf(box.tag, box.kind, tx, ty))
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
  if (box.more !== null)
    parts.push(textAt(cls("more"), x + 12, y + 46 + 14 * rows.length, box.more))
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
}

function legendSample(
  kind: NodeKind,
  shape: Shape | undefined
): LegendItem["draw"] {
  if (shape === undefined)
    return (x, y) => [rect(nodeClasses(kind), x, y - 6, 20, 12, 3)]
  return (x, y) => outline(nodeClasses(kind), x, y - 7, 20, 14, shape, true)
}

function edgeSample(kind: EdgeKind): LegendItem["draw"] {
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
    parts.push(
      ...item.draw(x, y),
      textAt(cls("legend-item"), x + item.mark, y + 4, item.name)
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
