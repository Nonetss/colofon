import { z } from "zod"
import type { Graphic, LegendEntry } from "#diagrams/model"
import { listOf, salvagedList } from "#diagrams/report"
import type { References } from "#diagrams/schema"
import { checkBudget } from "#diagrams/types/kit/budget"
import { label, readFormat, shape } from "#diagrams/types/kit/charts"
import { formSchema, itemList } from "#diagrams/types/kit/form"
import { type Item, itemFields } from "#diagrams/types/kit/items"
import { datumOf, markIds, tenth, tenthText } from "#diagrams/types/kit/marks"
import {
  emptyScene,
  type Scene,
  type Tools,
  type TypeModule,
} from "#diagrams/types/kit/scene"
import {
  formatFields,
  formatNumber,
  numberSchema,
  type ValueFormat,
} from "#diagrams/types/kit/values"

// Sankey (diagram-design's `type-sankey.md`): where a quantity goes as it
// splits and merges over two or three columns. Node bars and ribbons share
// one scale for the whole diagram, so a band's thickness is its quantity;
// each ribbon is one filled band whose control points both sit at the
// columns' midpoint, so it leaves and reaches its bars horizontally. The
// focal path is painted in the accent over the rest. No arrowheads: the
// columns' order is the direction.

const LIMITS = [
  { max: 3, what: "columnas" },
  { max: 8, what: "nodos" },
  { max: 12, what: "flujos" },
]

const WIDTH = 760
const TOP = 40
const PLOT_H = 320
/** The space between two nodes of a column, where a middle node's label sits. */
const GAP = 36
const BAR = 12
/** The room the outer columns leave for their labels. */
const SIDE = 160

const flowSchema = z.strictObject({
  from: z.string().meta({ description: "El id del nodo del que sale" }),
  to: z.string().meta({
    description: "El id del nodo, en la columna siguiente, al que llega",
  }),
  value: numberSchema
    .refine((value) => value > 0, { error: "Es un número mayor que 0" })
    .meta({ description: "Cuánto pasa por él" }),
  focal: z.boolean().optional().meta({
    description: "true: es parte del camino destacado, en el color de acento",
  }),
  info: z.string().min(1).optional(),
})

type Flow = z.infer<typeof flowSchema>

function nodeSchema(references: References) {
  return z.strictObject(itemFields(references))
}

const nodes = nodeSchema({})

function schema(references: References) {
  return formSchema("sankey", [], {
    columns: z
      .array(z.array(nodeSchema(references)).min(1))
      .min(2)
      .meta({
        description:
          "De 2 a 3 columnas, de izquierda a derecha: sus nodos, con id",
      }),
    flows: z.array(flowSchema).min(1).meta({
      description: "Lo que pasa de un nodo al de la columna siguiente",
    }),
    ...formatFields(),
  })
}

type Node = {
  item: Item
  id: string
  column: number
  /** What goes in and out. */
  received: number
  sent: number
  /** Its bar. */
  x: number
  y: number
  h: number
}

function read(data: Record<string, unknown>, tools: Tools): Scene | null {
  const report = tools.report
  const format = readFormat(data, report)
  const columns: Node[][] = []
  listOf(data.columns, "columns", report, true).forEach((column, index) => {
    const read = itemList(nodes, column, `columns.${index}`, tools, {
      needsId: true,
    })
    columns.push(
      read
        .filter(({ item }) => item.id !== null)
        .map(({ item }) => ({
          item,
          id: item.id ?? "",
          column: index,
          received: 0,
          sent: 0,
          x: 0,
          y: 0,
          h: 0,
        }))
    )
  })
  if (columns.length < 2) {
    report("columns", "Un Sankey lleva al menos 2 columnas")
    return null
  }
  const byId = new Map<string, Node>()
  for (const column of columns)
    for (const node of column) byId.set(node.id, node)
  const flows = knownFlows(data.flows, byId, tools)
  checkBudget(
    "Un Sankey",
    LIMITS,
    [columns.length, byId.size, flows.length],
    report
  )
  for (const { flow } of flows) {
    const from = byId.get(flow.from)
    const to = byId.get(flow.to)
    if (from !== undefined) from.sent += flow.value
    if (to !== undefined) to.received += flow.value
  }
  for (const column of columns.slice(1, -1))
    for (const node of column)
      if (node.received !== node.sent)
        report(
          node.item.at,
          `\`${node.id}\` recibe ${formatNumber(node.received, format)} y envía ${formatNumber(node.sent, format)}: lo que entra en un nodo del medio sale de él`
        )

  placeNodes(columns)
  const scene = emptyScene({ width: WIDTH, height: TOP + PLOT_H + 24 })
  const nextId = markIds()
  const ribbons = ribbonsOf(columns, flows, byId)
  // Ordinary ribbons first, the focal path's over them.
  const ordered = [...ribbons].sort(
    (a, b) => Number(a.flow.focal === true) - Number(b.flow.focal === true)
  )
  for (const { flow, d } of ordered) {
    const from = byId.get(flow.from)
    const to = byId.get(flow.to)
    if (from === undefined || to === undefined) continue
    const datum = datumOf(
      nextId(),
      `${from.item.name} → ${to.item.name}`,
      null,
      formatNumber(flow.value, format),
      flow.info ?? null
    )
    scene.under.push(ribbonShape(d, flow.focal === true, datum))
  }
  for (const column of columns)
    for (const node of column) {
      scene.over.push(
        shape(
          {
            kind: "rect",
            x: node.x,
            y: node.y,
            w: BAR,
            h: Math.max(2, node.h),
            r: 0,
          },
          [barClass(node)],
          {
            datum: datumOf(
              nextId(),
              node.item.name,
              null,
              formatNumber(quantity(node), format),
              node.item.info
            ),
            link: node.item.link,
          }
        )
      )
      scene.over.push(...nodeLabels(node, columns.length, format))
    }
  // A focal path counts as one accent, however many ribbons it spans.
  scene.accents =
    Number(flows.some(({ flow }) => flow.focal === true)) +
    [...byId.values()].filter((node) => node.item.focal).length
  scene.legend = legendOf(flows.map(({ flow }) => flow))
  scene.text = [
    {
      kind: "list",
      ordered: false,
      items: flows.map(({ flow }) => [
        `${nameOf(byId, flow.from)} → ${nameOf(byId, flow.to)}: ${formatNumber(flow.value, format)}`,
      ]),
    },
  ]
  return scene
}

/**
 * The flows whose ends are nodes, each from a column to the next one; a
 * flow to an unknown node, skipping a column or going backwards is reported
 * and left out.
 */
function knownFlows(
  value: unknown,
  byId: ReadonlyMap<string, Node>,
  tools: Tools
): { at: string; flow: Flow }[] {
  const kept: { at: string; flow: Flow }[] = []
  for (const { at, value: flow } of salvagedList(
    flowSchema,
    value,
    "flows",
    ["from", "to", "value"],
    tools.report
  )) {
    const from = byId.get(flow.from)
    const to = byId.get(flow.to)
    if (from === undefined)
      tools.report(`${at}.from`, `\`${flow.from}\` no es ninguno de los nodos`)
    if (to === undefined)
      tools.report(`${at}.to`, `\`${flow.to}\` no es ninguno de los nodos`)
    if (from === undefined || to === undefined) continue
    if (to.column !== from.column + 1) {
      tools.report(
        at,
        `Un flujo va de una columna a la siguiente: \`${flow.from}\` está en la columna ${from.column + 1} y \`${flow.to}\` en la ${to.column + 1}`
      )
      continue
    }
    kept.push({ at, flow })
  }
  return kept
}

/** What passes through a node: what it sends from the first column, receives in the last, the larger in between. */
function quantity(node: Node): number {
  return Math.max(node.received, node.sent)
}

/**
 * Bars of one scale for the whole diagram: the tallest column fills the
 * plot, every column is centred in it, and the columns spread from the
 * left labels' room to the right ones'.
 */
function placeNodes(columns: readonly Node[][]) {
  const k = Math.min(
    ...columns.map((column) => {
      const total = column.reduce((sum, node) => sum + quantity(node), 0)
      if (total === 0) return Number.POSITIVE_INFINITY
      return (PLOT_H - GAP * (column.length - 1)) / total
    })
  )
  const scale = Number.isFinite(k) ? k : 0
  const last = columns.length - 1
  columns.forEach((column, index) => {
    const x = SIDE + ((WIDTH - 2 * SIDE - BAR) * index) / last
    const height =
      column.reduce((sum, node) => sum + quantity(node) * scale, 0) +
      GAP * (column.length - 1)
    let y = TOP + (PLOT_H - height) / 2
    for (const node of column) {
      node.x = tenth(x)
      node.y = tenth(y)
      node.h = tenth(quantity(node) * scale)
      y += quantity(node) * scale + GAP
    }
  })
}

/**
 * Each flow's band: it leaves its source below the flows before it (in the
 * order of their targets) and reaches its target below the flows already
 * there (in the order of their sources).
 */
function ribbonsOf(
  columns: readonly Node[][],
  flows: readonly { flow: Flow }[],
  byId: ReadonlyMap<string, Node>
): { flow: Flow; d: string }[] {
  const height = scaleOf(columns)
  const outAt = new Map<string, number>()
  const inAt = new Map<string, number>()
  const yOf = (id: string) => byId.get(id)?.y ?? 0
  const leaving = [...flows].sort((a, b) => yOf(a.flow.to) - yOf(b.flow.to))
  const tops = new Map<Flow, { source: number; target: number }>()
  for (const { flow } of leaving) {
    const from = byId.get(flow.from)
    if (from === undefined) continue
    const used = outAt.get(flow.from) ?? 0
    tops.set(flow, { source: from.y + used, target: 0 })
    outAt.set(flow.from, used + flow.value * height)
  }
  const arriving = [...flows].sort(
    (a, b) => yOf(a.flow.from) - yOf(b.flow.from)
  )
  for (const { flow } of arriving) {
    const to = byId.get(flow.to)
    const top = tops.get(flow)
    if (to === undefined || top === undefined) continue
    const used = inAt.get(flow.to) ?? 0
    top.target = to.y + used
    inAt.set(flow.to, used + flow.value * height)
  }
  return flows.map(({ flow }) => {
    const from = byId.get(flow.from)
    const to = byId.get(flow.to)
    const top = tops.get(flow)
    if (from === undefined || to === undefined || top === undefined)
      return { flow, d: "" }
    const thickness = flow.value * height
    return {
      flow,
      d: ribbonPath(from.x + BAR, to.x, top.source, top.target, thickness),
    }
  })
}

/** The px per unit the nodes were placed with. */
function scaleOf(columns: readonly Node[][]): number {
  for (const column of columns)
    for (const node of column)
      if (quantity(node) > 0) return node.h / quantity(node)
  return 0
}

/**
 * One closed band from (x0, y0) to (x1, y1), `thickness` tall, both control
 * points at the midpoint so it leaves and arrives horizontally.
 */
export function ribbonPath(
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  thickness: number
): string {
  const mx = tenthText((x0 + x1) / 2)
  const b0 = y0 + thickness
  const b1 = y1 + thickness
  return [
    `M${tenthText(x0)} ${tenthText(y0)}`,
    `C${mx} ${tenthText(y0)} ${mx} ${tenthText(y1)} ${tenthText(x1)} ${tenthText(y1)}`,
    `L${tenthText(x1)} ${tenthText(b1)}`,
    `C${mx} ${tenthText(b1)} ${mx} ${tenthText(b0)} ${tenthText(x0)} ${tenthText(b0)}`,
    "Z",
  ].join(" ")
}

function ribbonShape(
  d: string,
  focal: boolean,
  datum: ReturnType<typeof datumOf>
): Graphic {
  if (focal)
    return shape({ kind: "path", d }, ["fill-accent"], { opacity: 0.28, datum })
  return shape({ kind: "path", d }, ["fill-muted"], { opacity: 0.18, datum })
}

function barClass(node: Node): string {
  if (node.item.focal) return "fill-accent"
  return "fill-ink"
}

/**
 * A node's name and quantity: outside its bar in the first and last
 * columns, centred in the gap above it in the middle one.
 */
function nodeLabels(
  node: Node,
  columns: number,
  format: ValueFormat
): Graphic[] {
  const value = formatNumber(quantity(node), format)
  const middle = node.y + node.h / 2
  if (node.column === 0)
    return [
      label(node.x - 8, middle - 1, node.item.name, "name", "end"),
      label(node.x - 8, middle + 11, value, "tick", "end", ["text-muted"]),
    ]
  if (node.column === columns - 1)
    return [
      label(node.x + BAR + 8, middle - 1, node.item.name, "name", "start"),
      label(node.x + BAR + 8, middle + 11, value, "tick", "start", [
        "text-muted",
      ]),
    ]
  const centre = node.x + BAR / 2
  return [
    label(centre, node.y - 17, node.item.name, "name", "middle"),
    label(centre, node.y - 6, value, "tick", "middle", ["text-muted"]),
  ]
}

function nameOf(byId: ReadonlyMap<string, Node>, id: string): string {
  const node = byId.get(id)
  if (node === undefined) return id
  return node.item.name
}

function legendOf(flows: readonly Flow[]): LegendEntry[] {
  const entries: LegendEntry[] = [
    {
      name: "Flujo",
      sample: { kind: "swatch", classes: ["fill-soft"], hue: null },
      series: null,
    },
  ]
  if (flows.some((flow) => flow.focal === true))
    entries.push({
      name: "Camino destacado",
      sample: { kind: "swatch", classes: ["fill-accent"], hue: null },
      series: null,
    })
  return entries
}

export const sankey: TypeModule = {
  name: "sankey",
  label: "Un Sankey",
  keys: ["columns", "flows", "unit", "decimals"],
  variants: [],
  schema,
  read: (data, tools) => read(data, tools),
}
