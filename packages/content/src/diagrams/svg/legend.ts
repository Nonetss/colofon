import type { Element } from "hast"
import { badgeWidth, textWidth } from "#diagrams/measure"
import type {
  BoxShape,
  Diagram,
  DiagramEdge,
  LegendEntry,
  LegendSample,
} from "#diagrams/model"
import {
  EDGE_KINDS,
  type EdgeKind,
  type Head,
  NODE_KINDS,
  type NodeKind,
} from "#diagrams/schema"
import { nodeClasses, outline } from "#diagrams/svg/boxes"
import { edgeLine } from "#diagrams/svg/edges"
import {
  cls,
  element,
  hair,
  hued,
  n,
  P,
  rect,
  textAt,
} from "#diagrams/svg/elements"
import { swatchOpacity } from "#diagrams/svg/graphics"

// The legend strip under a diagram: the kinds of boxes, arrows and badges it
// uses, named as the diagram says or by default, and a typed form's entries.

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
export function legendOf(
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
