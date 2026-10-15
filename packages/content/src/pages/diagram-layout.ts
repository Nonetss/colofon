import ELK, {
  type ElkExtendedEdge,
  type ElkLabel,
  type ElkNode,
} from "elkjs/lib/elk.bundled.js"
import type { Diagram, DiagramNode } from "#pages/diagrams"

// Where the boxes of a diagram go. The platform places them, never the
// content: ELK's layered layout runs over the nodes, the zones (compound
// nodes around their nodes) and the connections, in declaration order with
// fixed options, so a diagram is laid out the same way every time it is
// read. The order written is also the flow: when the connections loop, the
// one that goes against it is the one drawn backwards. There is no DOM on
// the server, so text is measured with an average glyph width for the sizes
// the reader's CSS fixes (`DIAGRAM_TEXT`).

/** A rectangle in the drawing's coordinates. */
export type Box = { x: number; y: number; width: number; height: number }

export type Point = { x: number; y: number }

/** A node's box and the lines its `sub` is drawn in. */
export type NodeLayout = Box & { id: string; sub: string[] }

export type ZoneLayout = Box & { id: string }

export type EdgeLayout = {
  from: string
  to: string
  /** The label's lines, none without a label. */
  lines: string[]
  /** The route, from the source's border to the target's, at least 2 points. */
  points: Point[]
  /** Where the label goes, `null` without one. */
  label: Box | null
}

/** A laid-out diagram, every coordinate absolute, from (0, 0). */
export type DiagramLayout = {
  width: number
  height: number
  nodes: NodeLayout[]
  zones: ZoneLayout[]
  edges: EdgeLayout[]
}

/**
 * The text of a drawing: font size, average glyph width as a share of it
 * (letter spacing included, on the safe side) and line height. The CSS of
 * `.doc-diagram-*` sets the same sizes.
 */
export const DIAGRAM_FONTS = {
  /** A node's name: sans, 600. */
  name: { size: 12, glyph: 0.56, line: 15 },
  /** A node's `sub` lines: mono. */
  sub: { size: 9, glyph: 0.62, line: 15 },
  /** A connection's label: mono, 0.04em apart. */
  label: { size: 8, glyph: 0.68, line: 11 },
  /** A zone's title: mono, uppercase, 0.14em apart. */
  zone: { size: 8, glyph: 0.76, line: 11 },
} as const

type Font = (typeof DIAGRAM_FONTS)[keyof typeof DIAGRAM_FONTS]

/** Spacing of the drawing, in its own pixels. */
export const DIAGRAM_SPACING = {
  /** Space between a node's border and its text, across and down. */
  nodeX: 16,
  nodeY: 12,
  /** A node's icon and the gap after it, on the name's line. */
  icon: 13,
  iconGap: 6,
  /** Extra room at the top of an `almacen` node, drawn as a cylinder. */
  cylinder: 7,
  /** Space inside a zone, and above its nodes for its title. */
  zone: 14,
  zoneTitle: 16,
  /** Space around a label's text, inside its mask. */
  label: 4,
  /** Characters per line before a `sub` or a label wraps. */
  subWrap: 34,
  labelWrap: 18,
} as const

/** The reference diagrams' smallest box: 176 × 64, every box of a diagram alike. */
const MIN_NODE_WIDTH = 176
const MIN_NODE_HEIGHT = 64
/** Box widths are rounded up to this step, like the reference grid. */
const GRID = 8

/** The width `text` takes in `font`, estimated. */
export function textWidth(text: string, font: Font): number {
  return Math.ceil([...text].length * font.size * font.glyph)
}

/** `text` split in lines of at most `width` characters, at spaces. */
export function wrapText(text: string, width: number): string[] {
  const lines: string[] = []
  let line = ""
  for (const word of text.split(/\s+/).filter((part) => part !== "")) {
    const next = joinWord(line, word)
    if (line !== "" && next.length > width) {
      lines.push(line)
      line = word
      continue
    }
    line = next
  }
  if (line !== "") lines.push(line)
  return lines
}

function joinWord(line: string, word: string): string {
  if (line === "") return word
  return `${line} ${word}`
}

/** The lines of a node's `sub`. */
function subLines(node: DiagramNode): string[] {
  if (node.sub === null) return []
  return wrapText(node.sub, DIAGRAM_SPACING.subWrap)
}

/** The lines of a connection's label. */
function labelLines(label: string | null): string[] {
  if (label === null) return []
  return wrapText(label, DIAGRAM_SPACING.labelWrap)
}

/** The width of a node's name line: its icon, then its name. */
export function nameWidth(node: DiagramNode): number {
  const name = textWidth(node.name, DIAGRAM_FONTS.name)
  if (node.icon === null) return name
  return DIAGRAM_SPACING.icon + DIAGRAM_SPACING.iconGap + name
}

/** Extra room at the top of a node for its shape. */
export function shapeTop(node: DiagramNode): number {
  if (node.kind === "almacen") return DIAGRAM_SPACING.cylinder
  return 0
}

/** The room a node's text takes: its name and `sub` lines, its icon and shape. */
export function nodeSize(node: DiagramNode): {
  width: number
  height: number
} {
  const s = DIAGRAM_SPACING
  const lines = subLines(node)
  const widths = [
    nameWidth(node),
    ...lines.map((line) => textWidth(line, DIAGRAM_FONTS.sub)),
  ]
  const width = Math.max(...widths) + s.nodeX * 2
  const height =
    s.nodeY * 2 +
    shapeTop(node) +
    DIAGRAM_FONTS.name.line +
    lines.length * DIAGRAM_FONTS.sub.line
  return { width, height }
}

/**
 * The size of every box of `diagram`: all alike, as in a drawn grid, wide
 * and tall enough for its largest node and never under 176 × 64.
 */
export function boxSize(diagram: Diagram): { width: number; height: number } {
  return {
    width: gridWidth([...diagram.nodes.values()]),
    height: Math.max(
      MIN_NODE_HEIGHT,
      ...[...diagram.nodes.values()].map((node) => nodeSize(node).height)
    ),
  }
}

/** The width that fits every node of `nodes`, on the grid, never under 176. */
function gridWidth(nodes: readonly DiagramNode[]): number {
  const width = Math.max(
    MIN_NODE_WIDTH,
    ...nodes.map((node) => nodeSize(node).width)
  )
  return Math.ceil(width / GRID) * GRID
}

/**
 * For a left-to-right diagram, each column's width, by node id: the nodes
 * a first layout put in the same column (their boxes overlap across) take
 * the width their widest one needs, as in a drawn grid of columns.
 */
function columnWidths(
  diagram: Diagram,
  first: DiagramLayout
): Map<string, number> {
  const sorted = [...first.nodes].sort((a, b) => a.x - b.x)
  const columns: NodeLayout[][] = []
  for (const box of sorted) {
    const column = columns.at(-1)
    const last = column?.at(-1)
    if (
      column !== undefined &&
      last !== undefined &&
      box.x < last.x + last.width
    )
      column.push(box)
    else columns.push([box])
  }
  const widths = new Map<string, number>()
  for (const column of columns) {
    const nodes = column
      .map((box) => diagram.nodes.get(box.id))
      .filter((node) => node !== undefined)
    const width = gridWidth(nodes)
    for (const box of column) widths.set(box.id, width)
  }
  return widths
}

const ROOT_OPTIONS = {
  "elk.algorithm": "layered",
  "elk.hierarchyHandling": "INCLUDE_CHILDREN",
  "elk.edgeRouting": "ORTHOGONAL",
  "elk.edgeLabels.placement": "CENTER",
  // The order written is the flow: a loop is broken against it.
  "elk.layered.cycleBreaking.strategy": "MODEL_ORDER",
  "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES",
  "elk.layered.nodePlacement.strategy": "BRANDES_KOEPF",
  "elk.layered.nodePlacement.bk.fixedAlignment": "BALANCED",
  "elk.layered.spacing.nodeNodeBetweenLayers": "28",
  "elk.layered.spacing.edgeNodeBetweenLayers": "10",
  "elk.layered.spacing.edgeEdgeBetweenLayers": "14",
  "elk.spacing.nodeNode": "24",
  "elk.spacing.edgeNode": "20",
  "elk.spacing.edgeEdge": "14",
  "elk.spacing.edgeLabel": "4",
  "elk.padding": "[top=4,left=4,bottom=4,right=4]",
}

function directionOption(direction: Diagram["direction"]): string {
  if (direction === "abajo") return "DOWN"
  return "RIGHT"
}

/**
 * The graph ELK lays out: the nodes in declaration order, each zone where
 * its first node is declared (a compound node around its nodes), the edges
 * at the root.
 */
function elkGraph(
  diagram: Diagram,
  widths?: ReadonlyMap<string, number>
): ElkNode {
  const zoneOf = new Map<string, string>()
  for (const zone of diagram.zones)
    for (const node of zone.nodes) zoneOf.set(node, zone.id)

  const size = boxSize(diagram)
  const leaf = (node: DiagramNode): ElkNode => ({
    id: nodeId(node.id),
    width: widthOf(node.id, widths, size.width),
    height: size.height,
  })
  const children: ElkNode[] = []
  const placed = new Set<string>()
  for (const node of diagram.nodes.values()) {
    const zoneId = zoneOf.get(node.id)
    if (zoneId === undefined) {
      children.push(leaf(node))
      continue
    }
    if (placed.has(zoneId)) continue
    placed.add(zoneId)
    const zone = diagram.zones.find((written) => written.id === zoneId)
    if (zone === undefined) continue
    children.push(zoneNode(zone, diagram, leaf))
  }
  const edges: ElkExtendedEdge[] = diagram.connections.map(
    (connection, index) => ({
      id: edgeId(index),
      sources: [nodeId(connection.from)],
      targets: [nodeId(connection.to)],
      labels: edgeLabels(labelLines(connection.label)),
    })
  )
  return {
    id: ROOT_ID,
    layoutOptions: {
      ...ROOT_OPTIONS,
      "elk.direction": directionOption(diagram.direction),
    },
    children,
    edges,
  }
}

/** A node's box width: its column's when known, else the diagram's. */
function widthOf(
  id: string,
  widths: ReadonlyMap<string, number> | undefined,
  fallback: number
): number {
  const column = widths?.get(id)
  if (column === undefined) return fallback
  return column
}

function zoneNode(
  zone: Diagram["zones"][number],
  diagram: Diagram,
  leaf: (node: DiagramNode) => ElkNode
): ElkNode {
  const s = DIAGRAM_SPACING
  const minWidth =
    textWidth(zone.title.toUpperCase(), DIAGRAM_FONTS.zone) + s.zone * 2
  return {
    id: zoneElkId(zone.id),
    layoutOptions: {
      "elk.padding": `[top=${s.zoneTitle + s.zone},left=${s.zone},bottom=${s.zone},right=${s.zone}]`,
      "elk.nodeSize.constraints": "MINIMUM_SIZE",
      "elk.nodeSize.minimum": `(${minWidth}, 0)`,
    },
    children: zone.nodes
      .map((id) => diagram.nodes.get(id))
      .filter((node) => node !== undefined)
      .map(leaf),
  }
}

/** The size of a label's mask: its widest line and its lines, padded. */
export function labelSize(lines: readonly string[]): {
  width: number
  height: number
} {
  const font = DIAGRAM_FONTS.label
  const widest = Math.max(0, ...lines.map((line) => textWidth(line, font)))
  return {
    width: widest + DIAGRAM_SPACING.label * 2,
    height: lines.length * font.line + DIAGRAM_SPACING.label,
  }
}

function edgeLabels(lines: string[]): ElkExtendedEdge["labels"] {
  if (lines.length === 0) return []
  return [{ text: lines.join("\n"), ...labelSize(lines) }]
}

// ELK ids share one namespace; prefixes keep a node and a zone with the same
// id apart.
const ROOT_ID = "root"
const nodeId = (id: string) => `n:${id}`
const zoneElkId = (id: string) => `z:${id}`
const edgeId = (index: number) => `e:${index}`

/** What runs ELK's graph layout. */
export type LayoutEngine = { layout: (graph: ElkNode) => Promise<ElkNode> }

/**
 * ELK running in this process. Its bundle picks the in-process worker only
 * where `self` is undefined, and Bun defines `self`; it is hidden while the
 * engine is built and put back right after, both synchronously.
 */
export function createLayoutEngine(): LayoutEngine {
  const self = Object.getOwnPropertyDescriptor(globalThis, "self")
  Reflect.deleteProperty(globalThis, "self")
  try {
    return new ELK()
  } finally {
    if (self !== undefined) Object.defineProperty(globalThis, "self", self)
  }
}

/**
 * Lays `diagram` out with `engine`. Left to right, a first layout finds the
 * columns and a second one gives each column the width its names need.
 */
export async function layoutDiagram(
  diagram: Diagram,
  engine: LayoutEngine
): Promise<DiagramLayout> {
  const first = await layoutOnce(diagram, engine)
  if (diagram.direction === "abajo") return first
  return layoutOnce(diagram, engine, columnWidths(diagram, first))
}

async function layoutOnce(
  diagram: Diagram,
  engine: LayoutEngine,
  widths?: ReadonlyMap<string, number>
): Promise<DiagramLayout> {
  const graph = await engine.layout(elkGraph(diagram, widths))
  const origins = new Map<string, Point>([[ROOT_ID, { x: 0, y: 0 }]])
  const nodes: NodeLayout[] = []
  const zones: ZoneLayout[] = []

  const place = (child: ElkNode, origin: Point) => {
    const box = {
      x: origin.x + (child.x ?? 0),
      y: origin.y + (child.y ?? 0),
      width: child.width ?? 0,
      height: child.height ?? 0,
    }
    if (child.id.startsWith("z:")) {
      zones.push({ id: child.id.slice(2), ...box })
      origins.set(child.id, { x: box.x, y: box.y })
      for (const inner of child.children ?? []) place(inner, box)
      return
    }
    const id = child.id.slice(2)
    const node = diagram.nodes.get(id)
    const sub = node === undefined ? [] : subLines(node)
    nodes.push({ id, sub, ...box })
  }
  for (const child of graph.children ?? []) place(child, { x: 0, y: 0 })

  const laidOut = new Map<string, ElkExtendedEdge>()
  for (const edge of graph.edges ?? []) laidOut.set(edge.id, edge)
  const edges: EdgeLayout[] = []
  diagram.connections.forEach((connection, index) => {
    const edge = laidOut.get(edgeId(index))
    if (edge === undefined) return
    edges.push({
      from: connection.from,
      to: connection.to,
      lines: labelLines(connection.label),
      ...routeOf(edge, originOf(origins, edge)),
    })
  })

  return {
    width: Math.ceil(graph.width ?? 0),
    height: Math.ceil(graph.height ?? 0),
    nodes,
    zones,
    edges,
  }
}

/** An edge's points and label box, moved to absolute coordinates. */
function routeOf(
  edge: ElkExtendedEdge,
  origin: Point
): Pick<EdgeLayout, "points" | "label"> {
  const shift = (point: Point): Point => ({
    x: origin.x + point.x,
    y: origin.y + point.y,
  })
  const [section] = edge.sections ?? []
  const points: Point[] = []
  if (section !== undefined)
    points.push(
      shift(section.startPoint),
      ...(section.bendPoints ?? []).map(shift),
      shift(section.endPoint)
    )
  const [label] = edge.labels ?? []
  return { points, label: labelBox(label, origin) }
}

/**
 * Where the container ELK reports an edge's coordinates in starts: the zone
 * holding both ends, or the root.
 */
function originOf(
  origins: ReadonlyMap<string, Point>,
  edge: ElkExtendedEdge
): Point {
  if (edge.container === undefined) return { x: 0, y: 0 }
  const origin = origins.get(edge.container)
  if (origin === undefined) return { x: 0, y: 0 }
  return origin
}

function labelBox(label: ElkLabel | undefined, origin: Point): Box | null {
  if (label === undefined) return null
  return {
    x: origin.x + (label.x ?? 0),
    y: origin.y + (label.y ?? 0),
    width: label.width ?? 0,
    height: label.height ?? 0,
  }
}
