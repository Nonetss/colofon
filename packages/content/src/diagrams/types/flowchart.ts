import { z } from "zod"
import { fit } from "#diagrams/measure"
import {
  accentPaths,
  type BoxShape,
  type DiagramBox,
  type DiagramEdge,
  type LegendEntry,
} from "#diagrams/model"
import { salvagedList } from "#diagrams/report"
import type { References } from "#diagrams/schema"
import { checkBudget } from "#diagrams/types/kit/budget"
import { formSchema, itemList } from "#diagrams/types/kit/form"
import { type Item, itemBox, itemFields } from "#diagrams/types/kit/items"
import {
  knownLinks,
  type LinkWritten,
  linkEdge,
  linkLine,
  linkSchema,
} from "#diagrams/types/kit/links"
import {
  emptyScene,
  type Scene,
  type Tools,
  type TypeModule,
} from "#diagrams/types/kit/scene"
import { layered } from "#diagrams/types/layout/layered"

// Flowchart (diagram-design's `type-flowchart.md`): decision logic as steps
// and links. Steps take their row from their longest distance from a start
// unless they give one, and their column from their order in that row; the
// links run at right angles through the gutters. Decisions are diamonds
// with at most three exits.

const STEP_KINDS = ["step", "start", "end", "decision", "io"] as const

type StepKind = (typeof STEP_KINDS)[number]

const SHAPES: Record<StepKind, BoxShape | null> = {
  step: null,
  start: "pill",
  end: "pill",
  decision: "diamond",
  io: "parallelogram",
}

const NAMES: Record<StepKind, string> = {
  step: "Paso",
  start: "Inicio / fin",
  end: "Inicio / fin",
  decision: "Decisión",
  io: "Entrada / salida",
}

const LIMITS = [
  { max: 12, what: "pasos" },
  { max: 16, what: "enlaces" },
]

/** How many exits a decision can have. */
const MAX_EXITS = 3

function stepSchema(references: References) {
  return z.strictObject({
    ...itemFields(references),
    kind: z.enum(STEP_KINDS).optional().meta({
      description:
        "step (por defecto); start o end: una píldora; decision: un rombo; io: entrada o salida",
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

const steps = stepSchema({})

function schema(references: References) {
  return formSchema("flowchart", [], {
    steps: z.array(stepSchema(references)).min(1).meta({
      description: "Los pasos, cada uno con id",
    }),
    links: z.array(linkSchema).optional().meta({
      description: "Las flechas entre pasos: from, to y su etiqueta",
    }),
  })
}

/** A step's box size: as wide as its longest line, decisions bigger. */
function sizeOf(item: Item, kind: StepKind): { w: number; h: number } {
  const w = fit(item.name, item.sub, null, 120)
  if (kind === "decision") return { w: w + 48, h: 72 + 12 * item.sub.length }
  if (kind === "io") return { w: w + 16, h: 52 + 12 * item.sub.length }
  if (kind === "start" || kind === "end") return { w, h: 44 }
  return { w, h: 52 + 12 * item.sub.length }
}

function read(data: Record<string, unknown>, tools: Tools): Scene | null {
  const read = itemList(steps, data.steps, "steps", tools, { needsId: true })
  const ids = new Set<string>()
  for (const { item } of read) if (item.id !== null) ids.add(item.id)
  const links = knownLinks(
    salvagedList(
      linkSchema,
      data.links,
      "links",
      ["from", "to"],
      tools.report,
      false
    ),
    ids,
    tools.report
  )
  checkBudget(
    "Un diagrama de flujo",
    LIMITS,
    [read.length, links.length],
    tools.report
  )
  checkExits(read, links, tools)

  const kinds = new Map<string, StepKind>()
  const nodes = read
    .filter(({ item }) => item.id !== null)
    .map(({ item, written }) => {
      const kind = written.kind ?? "step"
      kinds.set(item.id ?? "", kind)
      return {
        id: item.id ?? "",
        ...sizeOf(item, kind),
        row: written.row ?? null,
        col: written.col ?? null,
      }
    })
  const starts = read
    .filter(({ written }) => written.kind === "start")
    .map(({ item }) => item.id ?? "")
  const layout = layered(
    nodes,
    links.map(({ written }) => written),
    { left: 32, top: 40, rowGap: 56, colGap: 56, starts }
  )

  const scene = emptyScene({ width: 0, height: 0 })
  const boxes = new Map<string, DiagramBox>()
  for (const { item } of read) {
    if (item.id === null) continue
    const cell = layout.cells.get(item.id)
    if (cell === undefined) continue
    const kind = kinds.get(item.id) ?? "step"
    const box = itemBox(item, {
      ...cell,
      shape: SHAPES[kind],
      kind: boxKind(kind),
    })
    boxes.set(item.id, box)
    scene.nodes.push(box)
  }
  const edges: DiagramEdge[] = []
  links.forEach(({ written }, index) => {
    const edge = linkEdge(index, written, layout.routes[index] ?? null, boxes, {
      kind: backKind(written, layout.back.has(index)),
    })
    if (edge !== null) edges.push(edge)
  })
  scene.edges = edges
  scene.size = {
    width: Math.ceil(layout.right + 48),
    height: Math.ceil(layout.bottom + 32),
  }
  scene.accents =
    read.filter(({ item }) => item.focal).length +
    accentPaths(edges.filter((edge) => edge.kind === "accent"))
  scene.legend = legendOf(kinds, edges)
  scene.text = [
    {
      kind: "list",
      ordered: false,
      items: links.map(({ written }) => linkLine(written)),
    },
  ]
  return scene
}

/** A start, an end or an io step looks like an input; the rest like a service. */
function boxKind(kind: StepKind): DiagramBox["kind"] {
  if (kind === "start" || kind === "end") return "input"
  if (kind === "io") return "store"
  return "service"
}

/** A link back up the chart is dashed unless it says otherwise. */
function backKind(link: LinkWritten, back: boolean): DiagramEdge["kind"] {
  if (link.kind !== undefined) return link.kind
  if (back) return "dash"
  return "default"
}

function checkExits(
  read: readonly { item: Item; written: { kind?: StepKind } }[],
  links: readonly { written: LinkWritten }[],
  tools: Tools
) {
  for (const { item, written } of read) {
    if (written.kind !== "decision" || item.id === null) continue
    const exits = links.filter(({ written: link }) => link.from === item.id)
    if (exits.length > MAX_EXITS)
      tools.report(
        item.at,
        `La decisión "${item.name}" tiene ${exits.length} salidas: como mucho ${MAX_EXITS}`
      )
  }
}

function legendOf(
  kinds: ReadonlyMap<string, StepKind>,
  edges: readonly DiagramEdge[]
): LegendEntry[] {
  const entries: LegendEntry[] = []
  const named = new Set<string>()
  for (const kind of STEP_KINDS) {
    if (![...kinds.values()].includes(kind) || named.has(NAMES[kind])) continue
    named.add(NAMES[kind])
    entries.push({
      name: NAMES[kind],
      sample: { kind: "node", node: boxKind(kind), shape: SHAPES[kind] },
      series: null,
    })
  }
  if (edges.some((edge) => edge.kind === "accent"))
    entries.push({
      name: "Camino principal",
      sample: { kind: "edge", edge: "accent" },
      series: null,
    })
  if (edges.some((edge) => edge.kind === "dash"))
    entries.push({
      name: "Vuelta / opcional",
      sample: { kind: "edge", edge: "dash" },
      series: null,
    })
  return entries
}

export const flowchart: TypeModule = {
  name: "flowchart",
  label: "Un diagrama de flujo",
  keys: ["steps", "links"],
  variants: [],
  schema,
  read: (data, tools) => read(data, tools),
}
