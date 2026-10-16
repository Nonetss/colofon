import { z } from "zod"
import { fit } from "#diagrams/measure"
import type {
  DiagramBox,
  DiagramEdge,
  LegendEntry,
  Point,
  TextPart,
  TextTree,
} from "#diagrams/model"
import type { References } from "#diagrams/schema"
import { checkBudget } from "#diagrams/types/kit/budget"
import { formSchema, itemList } from "#diagrams/types/kit/form"
import { type Item, itemBox, itemFields } from "#diagrams/types/kit/items"
import {
  emptyScene,
  type Scene,
  type Tools,
  type TypeModule,
} from "#diagrams/types/kit/scene"
import { type TreeNode, tidyTree } from "#diagrams/types/layout/tidy-tree"

// Tree and org chart (diagram-design's `type-tree.md` and
// `type-org-chart.md`): a hierarchy from one root, laid out as a tidy tree,
// parents centred over their children and joined to them by elbow
// connectors (a drop, a bus, a drop). An org chart's nodes also carry their
// role as a tag, and may report to someone else too: a dashed curve.

const DIRECTIONS = ["down", "right"] as const

type Direction = (typeof DIRECTIONS)[number]

const LIMITS = [
  { max: 4, what: "niveles" },
  { max: 16, what: "nodos" },
  { max: 6, what: "hijos bajo un mismo nodo" },
]

/** The space between two levels, going down and going right. */
const LEVEL_GAP = { down: 48, right: 64 }

const MARGIN = 32

function treeNodeSchema(references: References) {
  return z.strictObject({
    ...itemFields(references),
    parent: z.string().optional().meta({
      description: "El id de su padre; el nodo sin parent es la raíz",
    }),
  })
}

function orgNodeSchema(references: References) {
  return treeNodeSchema(references).extend({
    role: z.string().min(1).optional().meta({
      description: "Su papel, en la etiqueta de arriba",
    }),
    dotted: z.array(z.string()).optional().meta({
      description: "Los ids de a quién más reporta: líneas a trazos",
    }),
  })
}

function nodeSchema(references: References, org: boolean) {
  if (org) return orgNodeSchema(references)
  return treeNodeSchema(references)
}

const orgNodes = orgNodeSchema({})

type Written = z.infer<typeof orgNodes>

function schema(name: string, org: boolean) {
  return (references: References) =>
    formSchema(name, [], {
      nodes: z.array(nodeSchema(references, org)).min(1).meta({
        description: "Los nodos, cada uno con id y, salvo la raíz, parent",
      }),
      direction: z.enum(DIRECTIONS).optional().meta({
        description:
          "down (por defecto): la raíz arriba; right: a la izquierda",
      }),
    })
}

type Read = { item: Item; written: Written }

function read(
  data: Record<string, unknown>,
  tools: Tools,
  org: boolean
): Scene | null {
  const label = labelOf(org)
  const read = itemList(orgNodes, data.nodes, "nodes", tools, {
    needsId: true,
  }).filter(({ item }) => item.id !== null)
  if (!org) for (const entry of read) orgOnly(entry, tools)
  const direction = directionOf(data.direction, tools)
  const byId = new Map<string, Read>()
  for (const entry of read) byId.set(entry.item.id ?? "", entry)
  const children = new Map<string, Read[]>()
  const roots: Read[] = []
  for (const entry of read) {
    const parent = entry.written.parent
    if (parent === undefined) {
      roots.push(entry)
      continue
    }
    if (!byId.has(parent)) {
      tools.report(
        `${entry.item.at}.parent`,
        `\`${parent}\` no es ninguno de los nodos`
      )
      continue
    }
    const list = children.get(parent)
    if (list === undefined) children.set(parent, [entry])
    else list.push(entry)
  }
  const [root, ...others] = roots
  if (root === undefined) {
    tools.report(
      "nodes",
      `${label} tiene una raíz: un nodo sin parent, y aquí no hay ninguno`
    )
    return null
  }
  if (others.length > 0) {
    tools.report(
      "nodes",
      `${label} tiene una sola raíz y aquí hay ${roots.length}: ${roots.map(({ item }) => item.id).join(", ")}`
    )
    return null
  }
  const reached = new Set<string>()
  const queue = [root]
  for (const entry of queue) {
    reached.add(entry.item.id ?? "")
    queue.push(...(children.get(entry.item.id ?? "") ?? []))
  }
  const loose = read.filter(
    ({ item, written }) =>
      !reached.has(item.id ?? "") &&
      written.parent !== undefined &&
      byId.has(written.parent)
  )
  if (loose.length > 0) {
    tools.report(
      "nodes",
      `Los padres de ${loose.map(({ item }) => item.id).join(", ")} forman un ciclo: no cuelgan de la raíz`
    )
    return null
  }

  const w = Math.max(
    120,
    ...read.map(({ item, written }) =>
      fit(item.name, item.sub, tagOf(written, org), 120)
    )
  )
  const tagRow = read.some(({ written }) => tagOf(written, org) !== null)
  const lines = Math.max(0, ...read.map(({ item }) => item.sub.length))
  const h = 44 + 12 * lines + tagRoom(tagRow)
  const treeOf = (entry: Read): TreeNode => ({
    id: entry.item.id ?? "",
    breadth: breadthOf(direction, w, h),
    children: (children.get(entry.item.id ?? "") ?? []).map(treeOf),
  })
  const tree = tidyTree(treeOf(root))
  const counts = [
    tree.depth + 1,
    read.length,
    Math.max(0, ...[...children.values()].map((list) => list.length)),
  ]
  checkBudget(label, LIMITS, counts, tools.report)

  const scene = emptyScene({ width: 0, height: 0 })
  const boxes = new Map<string, DiagramBox>()
  for (const { id, centre, depth } of tree.placed) {
    const entry = byId.get(id)
    if (entry === undefined) continue
    const place = placeOf(direction, centre, depth, w, h)
    const box = itemBox(entry.item, {
      ...place,
      w,
      h,
      tag: tagOf(entry.written, org),
    })
    boxes.set(id, box)
    scene.nodes.push(box)
  }
  const edges: DiagramEdge[] = []
  for (const [parent, list] of children) {
    const from = boxes.get(parent)
    if (from === undefined) continue
    for (const child of list) {
      const to = boxes.get(child.item.id ?? "")
      if (to === undefined) continue
      edges.push(connector(edges.length, from, to, direction))
    }
  }
  let dotted = false
  if (org) {
    for (const entry of read) {
      const from = boxes.get(entry.item.id ?? "")
      if (from === undefined) continue
      for (const [index, target] of (entry.written.dotted ?? []).entries()) {
        const to = boxes.get(target)
        if (to === undefined) {
          tools.report(
            `${entry.item.at}.dotted.${index}`,
            `\`${target}\` no es ninguno de los nodos`
          )
          continue
        }
        edges.push(dottedLine(edges.length, from, to))
        dotted = true
      }
    }
  }
  scene.edges = edges
  scene.size = sizeOf(direction, tree.extent, tree.depth, w, h)
  scene.accents = read.filter(({ item }) => item.focal).length
  scene.legend = legendOf(dotted)
  scene.text = [{ kind: "tree", items: [textTree(root, children, org)] }]
  return scene
}

/** The room a tag row takes above the names. */
function tagRoom(tagged: boolean): number {
  if (tagged) return 14
  return 0
}

/** A tree's node keeps none of an org chart's own keys. */
function orgOnly(entry: Read, tools: Tools) {
  for (const key of ["role", "dotted"] as const) {
    if (entry.written[key] === undefined) continue
    tools.report(
      `${entry.item.at}.${key}`,
      `\`${key}\` es de un organigrama (type: org-chart), no de un árbol`
    )
    entry.written[key] = undefined
  }
}

function labelOf(org: boolean): string {
  if (org) return "Un organigrama"
  return "Un árbol"
}

function directionOf(value: unknown, tools: Tools): Direction {
  if (value === undefined) return "down"
  if (value === "down" || value === "right") return value
  tools.report("direction", "Es down o right")
  return "down"
}

function tagOf(written: Written, org: boolean): string | null {
  if (!org) return null
  return written.role ?? null
}

/** A node's size along its level. */
function breadthOf(direction: Direction, w: number, h: number): number {
  if (direction === "down") return w
  return h
}

function placeOf(
  direction: Direction,
  centre: number,
  depth: number,
  w: number,
  h: number
): { x: number; y: number } {
  if (direction === "down")
    return {
      x: MARGIN + centre - w / 2,
      y: MARGIN + depth * (h + LEVEL_GAP.down),
    }
  return {
    x: MARGIN + depth * (w + LEVEL_GAP.right),
    y: MARGIN + centre - h / 2,
  }
}

function sizeOf(
  direction: Direction,
  extent: number,
  depth: number,
  w: number,
  h: number
): { width: number; height: number } {
  const levels = depth + 1
  if (direction === "down")
    return {
      width: Math.ceil(extent + 2 * MARGIN),
      height: Math.ceil(levels * h + depth * LEVEL_GAP.down + 2 * MARGIN),
    }
  return {
    width: Math.ceil(levels * w + depth * LEVEL_GAP.right + 2 * MARGIN),
    height: Math.ceil(extent + 2 * MARGIN),
  }
}

/** A drop from the parent, along the bus between levels, a drop into the child. */
function connector(
  index: number,
  from: DiagramBox,
  to: DiagramBox,
  direction: Direction
): DiagramEdge {
  return {
    ...edgeBase(index, from, to),
    kind: "default",
    route: "orthogonal",
    points: elbow(from, to, direction),
  }
}

function elbow(
  from: DiagramBox,
  to: DiagramBox,
  direction: Direction
): Point[] {
  if (direction === "down") {
    const fx = from.x + from.w / 2
    const tx = to.x + to.w / 2
    const bus = from.y + from.h + LEVEL_GAP.down / 2
    if (fx === tx)
      return [
        [fx, from.y + from.h],
        [tx, to.y],
      ]
    return [
      [fx, from.y + from.h],
      [fx, bus],
      [tx, bus],
      [tx, to.y],
    ]
  }
  const fy = from.y + from.h / 2
  const ty = to.y + to.h / 2
  const bus = from.x + from.w + LEVEL_GAP.right / 2
  if (fy === ty)
    return [
      [from.x + from.w, fy],
      [to.x, ty],
    ]
  return [
    [from.x + from.w, fy],
    [bus, fy],
    [bus, ty],
    [to.x, ty],
  ]
}

/**
 * A second reporting line: a dashed curve from a node's top into the
 * side of the box it also reports to, or over the top of one on its level.
 */
function dottedLine(
  index: number,
  from: DiagramBox,
  to: DiagramBox
): DiagramEdge {
  const start: Point = [from.x + from.w / 2, from.y]
  return {
    ...edgeBase(index, from, to),
    kind: "dash",
    route: "curve",
    points: [start, ...dottedRest(start, from, to)],
  }
}

function dottedRest(start: Point, from: DiagramBox, to: DiagramBox): Point[] {
  if (to.y === from.y) {
    const end: Point = [to.x + to.w / 2, to.y]
    return [[(start[0] + end[0]) / 2, start[1] - 24], end]
  }
  const side = to.x > from.x ? to.x : to.x + to.w
  const end: Point = [side, to.y + to.h / 2]
  return [[(start[0] + end[0]) / 2, end[1]], end]
}

function edgeBase(index: number, from: DiagramBox, to: DiagramBox) {
  return {
    index,
    from: from.id,
    to: to.id,
    toZone: null,
    hue: null,
    info: null,
    noHead: true,
    head: "arrow" as const,
    badge: null,
    label: null,
    at: null,
    anchor: "middle" as const,
  }
}

function legendOf(dotted: boolean): LegendEntry[] {
  if (!dotted) return []
  return [
    {
      name: "Reporta a",
      sample: { kind: "line", classes: ["fill-none", "line-muted"], hue: null },
      series: null,
    },
    {
      name: "También reporta a",
      sample: {
        kind: "line",
        classes: ["fill-none", "line-soft", "line-dash"],
        hue: null,
      },
      series: null,
    },
  ]
}

/** The nodes as a nested list, an org chart's with roles and dotted lines. */
function textTree(
  entry: Read,
  children: ReadonlyMap<string, Read[]>,
  org: boolean
): TextTree {
  const id = entry.item.id ?? ""
  const line: TextPart[] = [{ box: id }]
  const role = tagOf(entry.written, org)
  if (role !== null) line.push(` (${role})`)
  const dotted = entry.written.dotted ?? []
  if (org && dotted.length > 0) {
    line.push(" · también reporta a ")
    dotted.forEach((target, index) => {
      if (index > 0) line.push(", ")
      line.push({ box: target })
    })
  }
  return {
    line,
    children: (children.get(id) ?? []).map((child) =>
      textTree(child, children, org)
    ),
  }
}

export const tree: TypeModule = {
  name: "tree",
  label: "Un árbol",
  keys: ["nodes", "direction"],
  variants: [],
  schema: schema("tree", false),
  read: (data, tools) => read(data, tools, false),
}

export const orgChart: TypeModule = {
  name: "org-chart",
  label: "Un organigrama",
  keys: ["nodes", "direction"],
  variants: [],
  schema: schema("org-chart", true),
  read: (data, tools) => read(data, tools, true),
}
