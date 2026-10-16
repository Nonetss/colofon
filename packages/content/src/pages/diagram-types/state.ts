import { z } from "zod"
import { fit } from "#pages/diagram-measure"
import { salvagedList } from "#pages/diagram-read"
import type { References } from "#pages/diagram-schema"
import { checkBudget } from "#pages/diagram-types/budget"
import { formSchema, itemList } from "#pages/diagram-types/form"
import { itemBox, itemFields } from "#pages/diagram-types/items"
import { layered } from "#pages/diagram-types/layout/layered"
import {
  knownLinks,
  linkEdge,
  linkLine,
  linkSchema,
} from "#pages/diagram-types/links"
import {
  emptyScene,
  type Graphic,
  type LegendEntry,
  paint,
  type Scene,
  type Tools,
  type TypeModule,
} from "#pages/diagram-types/scene"
import type { DiagramBox, DiagramEdge } from "#pages/diagrams"

// State machine (diagram-design's `type-state.md`): states and the
// transitions between them, laid out as a flowchart. States are rounded
// rectangles; an initial state is entered from a filled dot above it, a
// final one leaves into a ringed dot below it, and a transition from a
// state to itself loops over its corner.

const LIMITS = [
  { max: 8, what: "estados" },
  { max: 14, what: "transiciones" },
]

/** How far the start and end markers sit from their state. */
const MARKER = { gap: 14, dot: 6, ring: 8, core: 5 }

function stateSchema(references: References) {
  return z.strictObject({
    ...itemFields(references),
    initial: z.boolean().optional().meta({
      description: "true: el estado en el que empieza",
    }),
    final: z.boolean().optional().meta({
      description: "true: un estado en el que acaba",
    }),
    row: z.number().int().min(0).optional().meta({
      description: "Su fila (0 la primera); por defecto, la que le toca",
    }),
    col: z.number().int().min(0).optional().meta({
      description:
        "Su columna (0 la primera); por defecto, su orden en la fila",
    }),
  })
}

const states = stateSchema({})

function schema(references: References) {
  return formSchema("state", [], {
    states: z.array(stateSchema(references)).min(1).meta({
      description: "Los estados, cada uno con id",
    }),
    transitions: z.array(linkSchema).optional().meta({
      description:
        "Las transiciones: from, to y lo que las dispara (evento [guarda] / acción)",
    }),
  })
}

function read(data: Record<string, unknown>, tools: Tools): Scene | null {
  const read = itemList(states, data.states, "states", tools, {
    needsId: true,
  })
  const ids = new Set<string>()
  for (const { item } of read) if (item.id !== null) ids.add(item.id)
  const transitions = knownLinks(
    salvagedList(
      linkSchema,
      data.transitions,
      "transitions",
      ["from", "to"],
      tools.report,
      false
    ),
    ids,
    tools.report
  )
  checkBudget(
    "Una máquina de estados",
    LIMITS,
    [read.length, transitions.length],
    tools.report
  )

  const nodes = read
    .filter(({ item }) => item.id !== null)
    .map(({ item, written }) => ({
      id: item.id ?? "",
      w: fit(item.name, item.sub, null, 120),
      h: 44 + 12 * item.sub.length,
      row: written.row ?? null,
      col: written.col ?? null,
    }))
  const starts = read
    .filter(({ written }) => written.initial === true)
    .map(({ item }) => item.id ?? "")
  const layout = layered(
    nodes,
    transitions.map(({ written }) => written),
    { left: 32, top: 56, rowGap: 64, colGap: 64, starts }
  )

  const scene = emptyScene({ width: 0, height: 0 })
  const boxes = new Map<string, DiagramBox>()
  let bottom = layout.bottom
  for (const { item, written } of read) {
    if (item.id === null) continue
    const cell = layout.cells.get(item.id)
    if (cell === undefined) continue
    const box = itemBox(item, { ...cell, shape: "rounded" })
    boxes.set(item.id, box)
    scene.nodes.push(box)
    if (written.initial === true) scene.under.push(...startMarker(box))
    if (written.final === true) {
      scene.under.push(...endMarker(box))
      bottom = Math.max(bottom, box.y + box.h + MARKER.gap + 2 * MARKER.ring)
    }
  }
  const edges: DiagramEdge[] = []
  transitions.forEach(({ written }, index) => {
    const edge = linkEdge(index, written, layout.routes[index] ?? null, boxes)
    if (edge !== null) edges.push(edge)
  })
  scene.edges = edges
  // A self-loop rises above its state and passes its right side.
  const right = Math.max(layout.right, ...edges.map(edgeRight))
  scene.size = {
    width: Math.ceil(right + 64),
    height: Math.ceil(bottom + 32),
  }
  scene.accents =
    read.filter(({ item }) => item.focal).length +
    edges.filter((edge) => edge.kind === "accent").length
  scene.legend = legendOf(
    read.some(({ written }) => written.initial === true),
    read.some(({ written }) => written.final === true),
    edges
  )
  scene.text = [
    {
      kind: "list",
      ordered: false,
      items: transitions.map(({ written }) => linkLine(written)),
    },
  ]
  return scene
}

function edgeRight(edge: DiagramEdge): number {
  if (edge.points === null) return 0
  return Math.max(...edge.points.map(([x]) => x))
}

/** A filled dot above the state and a short arrow into its top. */
function startMarker(box: DiagramBox): Graphic[] {
  const cx = box.x + box.w / 2
  const dotY = box.y - MARKER.gap - MARKER.dot - 8
  return [
    { kind: "circle", cx, cy: dotY, r: MARKER.dot, ...paint("fill-ink") },
    {
      kind: "line",
      x1: cx,
      y1: dotY + MARKER.dot,
      x2: cx,
      y2: box.y - 6,
      ...paint("fill-none", "line-ink"),
    },
    {
      kind: "polygon",
      points: [
        [cx, box.y],
        [cx - 3.6, box.y - 8],
        [cx + 3.6, box.y - 8],
      ],
      ...paint("fill-ink"),
    },
  ]
}

/** A short line out of the state's bottom into a ringed dot. */
function endMarker(box: DiagramBox): Graphic[] {
  const cx = box.x + box.w / 2
  const ringY = box.y + box.h + MARKER.gap + MARKER.ring
  return [
    {
      kind: "line",
      x1: cx,
      y1: box.y + box.h,
      x2: cx,
      y2: ringY - MARKER.ring,
      ...paint("fill-none", "line-ink"),
    },
    {
      kind: "circle",
      cx,
      cy: ringY,
      r: MARKER.ring,
      ...paint("fill-paper", "line-ink"),
    },
    { kind: "circle", cx, cy: ringY, r: MARKER.core, ...paint("fill-ink") },
  ]
}

function legendOf(
  initial: boolean,
  final: boolean,
  edges: readonly DiagramEdge[]
): LegendEntry[] {
  const entries: LegendEntry[] = [
    {
      name: "Estado",
      sample: { kind: "node", node: "service", shape: "rounded" },
      series: null,
    },
  ]
  if (initial)
    entries.push({
      name: "Inicio",
      sample: { kind: "dot", classes: ["fill-ink"], hue: null },
      series: null,
    })
  if (final)
    entries.push({
      name: "Fin",
      sample: { kind: "dot", classes: ["fill-paper", "line-ink"], hue: null },
      series: null,
    })
  if (edges.some((edge) => edge.kind === "accent"))
    entries.push({
      name: "Camino principal",
      sample: { kind: "edge", edge: "accent" },
      series: null,
    })
  if (edges.some((edge) => edge.kind === "dash"))
    entries.push({
      name: "Opcional",
      sample: { kind: "edge", edge: "dash" },
      series: null,
    })
  return entries
}

export const state: TypeModule = {
  name: "state",
  label: "Una máquina de estados",
  keys: ["states", "transitions"],
  variants: [],
  schema,
  read: (data, tools) => read(data, tools),
}
