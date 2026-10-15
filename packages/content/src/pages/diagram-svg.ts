import type { Element, ElementContent, Properties } from "hast"
import { type IconNode, icons } from "lucide"
import {
  type Box,
  DIAGRAM_FONTS,
  DIAGRAM_SPACING,
  type DiagramLayout,
  type EdgeLayout,
  type NodeLayout,
  nameWidth,
  type Point,
  shapeTop,
  type ZoneLayout,
} from "#pages/diagram-layout"
import type { Diagram, DiagramNode } from "#pages/diagrams"

// A laid-out diagram drawn as an inline SVG, in hast so it goes through the
// same sanitizer as every page. Colours and fonts come from the reader's CSS
// on the classes (`doc-diagram-*`), so the drawing follows the theme. No ids
// and no markers: arrowheads are their own paths. Content text (names,
// labels) only ever lands in text nodes.

const ARROW = { length: 8, half: 3.5 }
const CORNER = 6

/** The name of each kind of node in the legend; `pieza` is a plain node. */
const KIND_NAMES = { pieza: "Pieza", entrada: "Origen", almacen: "Datos" }

type KindKey = keyof typeof KIND_NAMES

const KIND_ORDER: KindKey[] = ["pieza", "entrada", "almacen"]

const LEGEND = {
  /** Space between the drawing and the legend's rule, and the rule and row. */
  gap: 20,
  rowGap: 24,
  row: 22,
  /** Where the items start, after "LEYENDA". */
  indent: 88,
  /** A legend item's text: sans 12px, like the page's small text. */
  itemSize: 11,
  itemGlyph: 0.56,
  /** The sample box before a kind's name, and the arrow before "Conexión". */
  swatch: 20,
  arrow: 30,
  between: 20,
}

/** The Lucide icons by their component name (`GitBranch`). */
const ICONS = new Map<string, IconNode>(Object.entries(icons))

/** `git-branch` → `GitBranch`, the key Lucide exports an icon under. */
function pascal(name: string): string {
  return name
    .split("-")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join("")
}

/** The elements of the Lucide icon `name`, `undefined` for an unknown one. */
export function iconNode(name: string): IconNode | undefined {
  return ICONS.get(pascal(name))
}

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

/** The drawing of `diagram` from its `layout`, with its legend when useful. */
export function diagramSvg(
  diagram: Diagram,
  layout: DiagramLayout,
  hrefOf: (node: DiagramNode) => string | null
): Element {
  const legend = legendOf(diagram, layout)
  const width = layout.width
  const height = layout.height + legend.height
  return element(
    "svg",
    {
      className: ["doc-diagram-svg"],
      viewBox: `0 0 ${n(width)} ${n(height)}`,
      role: "img",
      ariaLabel: altText(diagram),
    },
    [
      element("title", {}, [text(diagram.title)]),
      ...layout.zones.map((zone) => zoneOf(zone, diagram)),
      ...layout.edges.map(edgeOf),
      ...layout.edges.flatMap(labelOf),
      ...layout.nodes.map((box) => nodeOf(box, diagram, hrefOf)),
      ...legend.parts,
    ]
  )
}

function altText(diagram: Diagram): string {
  if (diagram.description === "") return diagram.title
  return `${diagram.title}. ${diagram.description}`
}

function rect(box: Box, radius: number, className: string): Element {
  return element("rect", {
    className: [className],
    x: n(box.x),
    y: n(box.y),
    width: n(box.width),
    height: n(box.height),
    rx: n(radius),
  })
}

function zoneOf(zone: ZoneLayout, diagram: Diagram): Element {
  const written = diagram.zones.find((declared) => declared.id === zone.id)
  const s = DIAGRAM_SPACING
  return element("g", { className: ["doc-diagram-zone"] }, [
    rect(zone, 8, "doc-diagram-zone-box"),
    element(
      "text",
      {
        className: ["doc-diagram-zone-title"],
        x: n(zone.x + s.zone),
        y: n(zone.y + s.zone + DIAGRAM_FONTS.zone.size),
      },
      [text(written?.title ?? "")]
    ),
  ])
}

/** A node's outline: a rounded box, or a cylinder for `almacen`. */
function outline(node: DiagramNode, box: Box): Element[] {
  if (node.kind !== "almacen") return [rect(box, 6, "doc-diagram-node-box")]
  const r = DIAGRAM_SPACING.cylinder
  const rx = box.width / 2
  const { x, y, width, height } = box
  return [
    element("path", {
      className: ["doc-diagram-node-box"],
      d: `M${n(x)} ${n(y + r)} A${n(rx)} ${n(r)} 0 0 1 ${n(x + width)} ${n(y + r)} V${n(y + height - r)} A${n(rx)} ${n(r)} 0 0 1 ${n(x)} ${n(y + height - r)} Z`,
    }),
    element("path", {
      className: ["doc-diagram-node-rim"],
      d: `M${n(x)} ${n(y + r)} A${n(rx)} ${n(r)} 0 0 0 ${n(x + width)} ${n(y + r)}`,
    }),
  ]
}

/**
 * Where a node's name sits: its baseline, with the name and `sub` lines
 * centred in the box under the shape's top.
 */
function nameBaseline(node: DiagramNode, box: NodeLayout): number {
  const top = box.y + shapeTop(node)
  const block =
    DIAGRAM_FONTS.name.line + box.sub.length * DIAGRAM_FONTS.sub.line
  const room = box.height - shapeTop(node)
  return top + (room - block) / 2 + DIAGRAM_FONTS.name.size * 0.95
}

function nodeOf(
  box: NodeLayout,
  diagram: Diagram,
  hrefOf: (node: DiagramNode) => string | null
): Element {
  const node = diagram.nodes.get(box.id)
  if (node === undefined) return element("g", {})
  const centre = box.x + box.width / 2
  const baseline = nameBaseline(node, box)
  const parts: ElementContent[] = [
    ...outline(node, box),
    ...nameOf(node, centre, baseline),
    ...box.sub.map((line, index) =>
      element(
        "text",
        {
          className: ["doc-diagram-sub"],
          x: n(centre),
          y: n(baseline + DIAGRAM_FONTS.sub.line * (index + 1)),
          textAnchor: "middle",
        },
        [text(line)]
      )
    ),
  ]
  const group = element("g", nodeProperties(node.kind), parts)
  const href = hrefOf(node)
  if (href === null) return group
  return element("a", { href }, [group])
}

/** The name line, centred: the icon first when the node has one. */
function nameOf(
  node: DiagramNode,
  centre: number,
  baseline: number
): Element[] {
  const name = (x: number, anchor: "start" | "middle") =>
    element(
      "text",
      {
        className: ["doc-diagram-name"],
        x: n(x),
        y: n(baseline),
        textAnchor: anchor,
      },
      [text(node.name)]
    )
  const start = centre - nameWidth(node) / 2
  const icon = iconOf(node, start, baseline)
  if (icon === null) return [name(centre, "middle")]
  const s = DIAGRAM_SPACING
  return [icon, name(start + s.icon + s.iconGap, "start")]
}

function nodeProperties(
  kind: DiagramNode["kind"],
  className = "doc-diagram-node"
): Properties {
  if (kind === null) return { className: [className] }
  return { className: [className], dataKind: kind }
}

/** The node's icon before its name, Lucide's 24px box scaled to the line. */
function iconOf(
  node: DiagramNode,
  x: number,
  baseline: number
): Element | null {
  if (node.icon === null) return null
  const drawn = iconNode(node.icon)
  if (drawn === undefined) return null
  const size = DIAGRAM_SPACING.icon
  const y = baseline - size + 2
  return element(
    "g",
    {
      className: ["doc-diagram-icon"],
      transform: `translate(${n(x)} ${n(y)}) scale(${n(size / 24)})`,
    },
    drawn.map(([tagName, attributes]) =>
      element(tagName, iconProperties(attributes))
    )
  )
}

function iconProperties(attributes: Record<string, unknown>): Properties {
  const properties: Properties = {}
  for (const [name, value] of Object.entries(attributes)) {
    if (typeof value === "string") properties[camel(name)] = value
    if (typeof value === "number") properties[camel(name)] = n(value)
  }
  return properties
}

function camel(name: string): string {
  return name.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase())
}

function edgeOf(edge: EdgeLayout): Element {
  return arrowLine(edge.points)
}

/** A route with its corners rounded, ending in an arrowhead. */
function arrowLine(
  points: readonly Point[],
  className = "doc-diagram-edge"
): Element {
  if (points.length < 2) return element("g", { className: [className] })
  return element("g", { className: [className] }, [
    element("path", {
      className: ["doc-diagram-line"],
      d: roundedPath(shortened(points)),
    }),
    element("path", { className: ["doc-diagram-arrow"], d: arrowHead(points) }),
  ])
}

/** The route without its last few pixels, where the arrowhead goes. */
function shortened(points: readonly Point[]): Point[] {
  const tip = points.at(-1)
  const before = points.at(-2)
  if (tip === undefined || before === undefined) return [...points]
  const along = unit(before, tip)
  return [
    ...points.slice(0, -1),
    { x: tip.x - along.x * ARROW.length, y: tip.y - along.y * ARROW.length },
  ]
}

function unit(from: Point, to: Point): Point {
  const length = Math.hypot(to.x - from.x, to.y - from.y)
  if (length === 0) return { x: 0, y: 0 }
  return { x: (to.x - from.x) / length, y: (to.y - from.y) / length }
}

/** An orthogonal route with its corners rounded. */
function roundedPath(points: readonly Point[]): string {
  const [first] = points
  if (first === undefined) return ""
  const parts = [`M${n(first.x)} ${n(first.y)}`]
  points.forEach((corner, index) => {
    const before = points[index - 1]
    const after = points[index + 1]
    if (before === undefined || after === undefined) return
    const radius = Math.min(
      CORNER,
      Math.hypot(corner.x - before.x, corner.y - before.y) / 2,
      Math.hypot(after.x - corner.x, after.y - corner.y) / 2
    )
    const into = unit(before, corner)
    const out = unit(corner, after)
    parts.push(
      `L${n(corner.x - into.x * radius)} ${n(corner.y - into.y * radius)}`,
      `Q${n(corner.x)} ${n(corner.y)} ${n(corner.x + out.x * radius)} ${n(corner.y + out.y * radius)}`
    )
  })
  const last = points.at(-1)
  if (last !== undefined && points.length > 1)
    parts.push(`L${n(last.x)} ${n(last.y)}`)
  return parts.join(" ")
}

/** A filled triangle whose tip is the route's last point. */
function arrowHead(points: readonly Point[]): string {
  const tip = points.at(-1)
  const before = points.at(-2)
  if (tip === undefined || before === undefined) return ""
  const along = unit(before, tip)
  const base: Point = {
    x: tip.x - along.x * ARROW.length,
    y: tip.y - along.y * ARROW.length,
  }
  const side: Point = { x: -along.y * ARROW.half, y: along.x * ARROW.half }
  return [
    `M${n(tip.x)} ${n(tip.y)}`,
    `L${n(base.x + side.x)} ${n(base.y + side.y)}`,
    `L${n(base.x - side.x)} ${n(base.y - side.y)}`,
    "Z",
  ].join(" ")
}

/** A label over its route, on a mask the colour of the drawing's paper. */
function labelOf(edge: EdgeLayout): Element[] {
  if (edge.label === null || edge.lines.length === 0) return []
  const box = edge.label
  const font = DIAGRAM_FONTS.label
  const centre = box.x + box.width / 2
  return [
    element("g", { className: ["doc-diagram-edge-label"] }, [
      rect(box, 2, "doc-diagram-label-box"),
      ...edge.lines.map((line, index) =>
        element(
          "text",
          {
            className: ["doc-diagram-label"],
            x: n(centre),
            y: n(
              box.y + DIAGRAM_SPACING.label / 2 + font.line * index + font.size
            ),
            textAnchor: "middle",
          },
          [text(line)]
        )
      ),
    ]),
  ]
}

type LegendItem = {
  name: string
  mark: number
  draw: (x: number, y: number) => Element
}

function kindKey(node: DiagramNode): KindKey {
  if (node.kind === null) return "pieza"
  return node.kind
}

function swatch(kind: KindKey): LegendItem {
  const nodeKind = kind === "pieza" ? null : kind
  return {
    name: KIND_NAMES[kind],
    mark: LEGEND.swatch + 8,
    draw: (x, y) =>
      element("g", nodeProperties(nodeKind, "doc-diagram-swatch"), [
        rect(
          { x, y: y - 6, width: LEGEND.swatch, height: 12 },
          3,
          "doc-diagram-node-box"
        ),
      ]),
  }
}

const CONNECTION: LegendItem = {
  name: "Conexión",
  mark: LEGEND.arrow + 8,
  draw: (x, y) =>
    arrowLine(
      [
        { x, y },
        { x: x + LEGEND.arrow, y },
      ],
      "doc-diagram-swatch"
    ),
}

/**
 * The legend under the drawing, when its nodes are of more than one kind:
 * a rule, "Leyenda" and one sample per kind used, then the arrow, in rows
 * that fit the drawing's width.
 */
function legendOf(
  diagram: Diagram,
  layout: DiagramLayout
): { height: number; parts: Element[] } {
  const kinds = new Set([...diagram.nodes.values()].map(kindKey))
  if (kinds.size < 2) return { height: 0, parts: [] }
  const items = [
    ...KIND_ORDER.filter((kind) => kinds.has(kind)).map(swatch),
    CONNECTION,
  ]

  const top = layout.height + LEGEND.gap
  const parts: Element[] = [
    element("path", {
      className: ["doc-diagram-rule"],
      d: `M0 ${n(top)} H${n(layout.width)}`,
    }),
    element(
      "text",
      {
        className: ["doc-diagram-legend"],
        x: "0",
        y: n(top + LEGEND.rowGap + 4),
      },
      [text("Leyenda")]
    ),
  ]
  let x = LEGEND.indent
  let y = top + LEGEND.rowGap
  for (const item of items) {
    const width =
      item.mark +
      Math.ceil(item.name.length * LEGEND.itemSize * LEGEND.itemGlyph)
    if (x > LEGEND.indent && x + width > layout.width) {
      x = LEGEND.indent
      y += LEGEND.row
    }
    parts.push(
      item.draw(x, y),
      element(
        "text",
        {
          className: ["doc-diagram-legend-item"],
          x: n(x + item.mark),
          y: n(y + 4),
        },
        [text(item.name)]
      )
    )
    x += width + LEGEND.between
  }
  return { height: y - layout.height + LEGEND.row / 2, parts }
}
