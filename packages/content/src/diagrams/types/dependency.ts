import { z } from "zod"
import { fit } from "#diagrams/measure"
import {
  accentPaths,
  type DiagramBox,
  type DiagramEdge,
  type LegendEntry,
  type TextPart,
} from "#diagrams/model"
import { salvagedList } from "#diagrams/report"
import type { References } from "#diagrams/schema"
import { checkBudget } from "#diagrams/types/kit/budget"
import { formSchema, itemList } from "#diagrams/types/kit/form"
import { itemBox, itemFields } from "#diagrams/types/kit/items"
import {
  knownLinks,
  type LinkWritten,
  linkEdge,
  linkSchema,
} from "#diagrams/types/kit/links"
import {
  emptyScene,
  type Scene,
  type Tools,
  type TypeModule,
} from "#diagrams/types/kit/scene"
import { layered } from "#diagrams/types/layout/layered"

// Dependency graph (diagram-design's `type-dependency.md`): what depends on
// what. Ranked layers from the nodes nothing depends on, at the top, down to
// the ones that depend on nothing; a node's tag counts how many depend on
// it. A cycle is the editorial point: its arrows go in the accent and the
// one that closes it, dashed, round the side.

const LIMITS = [
  { max: 9, what: "nodos" },
  { max: 14, what: "dependencias" },
  { max: 4, what: "rangos" },
  { max: 1, what: "ciclo marcado" },
]

const nodes = z.strictObject(itemFields({}))

function schema(references: References) {
  return formSchema("dependency", [], {
    nodes: z
      .array(z.strictObject(itemFields(references)))
      .min(1)
      .meta({
        description: "Los paquetes, módulos o servicios, cada uno con id",
      }),
    deps: z.array(linkSchema).optional().meta({
      description: "Las dependencias: from depende de to",
    }),
  })
}

function read(data: Record<string, unknown>, tools: Tools): Scene | null {
  const read = itemList(nodes, data.nodes, "nodes", tools, { needsId: true })
  const ids = new Set<string>()
  for (const { item } of read) if (item.id !== null) ids.add(item.id)
  const deps = knownLinks(
    salvagedList(
      linkSchema,
      data.deps,
      "deps",
      ["from", "to"],
      tools.report,
      false
    ),
    ids,
    tools.report
  )
  const links = deps.map(({ written }) => written)
  const fanIn = new Map<string, number>()
  for (const link of links)
    if (link.from !== link.to) fanIn.set(link.to, (fanIn.get(link.to) ?? 0) + 1)

  const sized = read
    .filter(({ item }) => item.id !== null)
    .map(({ item }) => ({
      item,
      tag: tagOf(fanIn.get(item.id ?? "") ?? 0),
    }))
  const layout = layered(
    sized.map(({ item, tag }) => ({
      id: item.id ?? "",
      w: fit(item.name, item.sub, tag, 140),
      h: 52 + 12 * item.sub.length,
      row: null,
      col: null,
    })),
    links,
    { left: 32, top: 40, rowGap: 64, colGap: 48 }
  )
  const ranks = new Set([...layout.cells.values()].map((cell) => cell.row))
  checkBudget(
    "Un grafo de dependencias",
    LIMITS,
    [read.length, deps.length, ranks.size, layout.cycles.length],
    tools.report
  )

  const scene = emptyScene({ width: 0, height: 0 })
  const boxes = new Map<string, DiagramBox>()
  for (const { item, tag } of sized) {
    const cell = layout.cells.get(item.id ?? "")
    if (cell === undefined) continue
    const box = itemBox(item, { ...cell, tag, kind: kindOf(item.id, links) })
    boxes.set(item.id ?? "", box)
    scene.nodes.push(box)
  }
  const onCycle = cycleLinks(layout.cycles, links)
  const edges: DiagramEdge[] = []
  links.forEach((link, index) => {
    const edge = linkEdge(index, link, layout.routes[index] ?? null, boxes, {
      kind: edgeKind(link, layout.back.has(index), onCycle.has(index)),
    })
    if (edge !== null) edges.push(edge)
  })
  scene.edges = edges
  scene.size = {
    width: Math.ceil(layout.right + 48),
    height: Math.ceil(layout.bottom + 32),
  }
  // A cycle counts as one accent, whatever its length.
  scene.accents =
    read.filter(({ item }) => item.focal).length +
    accentPaths(edges.filter((edge) => edge.kind === "accent"))
  scene.legend = legendOf(edges, layout.cycles.length > 0)
  scene.text = textOf(
    read.map(({ item }) => item.id),
    links,
    layout.cycles
  )
  return scene
}

/** "3 dependen" on a node others depend on, nothing on the rest. */
function tagOf(count: number): string | null {
  if (count === 0) return null
  if (count === 1) return "1 depende"
  return `${count} dependen`
}

/** A node that depends on nothing is a leaf, drawn as a store. */
function kindOf(
  id: string | null,
  links: readonly LinkWritten[]
): DiagramBox["kind"] {
  if (links.some((link) => link.from === id && link.to !== id)) return "service"
  return "store"
}

function edgeKind(
  link: LinkWritten,
  back: boolean,
  cycle: boolean
): DiagramEdge["kind"] {
  if (back) return "dash"
  if (cycle) return "accent"
  if (link.kind !== undefined) return link.kind
  return "default"
}

/** The indexes of the links along each cycle. */
function cycleLinks(
  cycles: readonly string[][],
  links: readonly LinkWritten[]
): Set<number> {
  const found = new Set<number>()
  for (const cycle of cycles) {
    cycle.forEach((id, position) => {
      const next = cycle[(position + 1) % cycle.length]
      const index = links.findIndex(
        (link) => link.from === id && link.to === next
      )
      if (index !== -1) found.add(index)
    })
  }
  return found
}

function legendOf(
  edges: readonly DiagramEdge[],
  cycle: boolean
): LegendEntry[] {
  const entries: LegendEntry[] = [
    {
      name: "Depende de",
      sample: { kind: "edge", edge: "default" },
      series: null,
    },
    {
      name: "No depende de nada",
      sample: { kind: "node", node: "store", shape: null },
      series: null,
    },
  ]
  if (cycle)
    entries.push(
      {
        name: "Ciclo",
        sample: { kind: "edge", edge: "accent" },
        series: null,
      },
      {
        name: "Cierra el ciclo",
        sample: { kind: "edge", edge: "dash" },
        series: null,
      }
    )
  else if (edges.some((edge) => edge.kind === "dash"))
    entries.push({
      name: "Opcional",
      sample: { kind: "edge", edge: "dash" },
      series: null,
    })
  return entries
}

/** One line per node with what it depends on, then each cycle. */
function textOf(
  ids: readonly (string | null)[],
  links: readonly LinkWritten[],
  cycles: readonly string[][]
): Scene["text"] {
  const lines: TextPart[][] = []
  for (const id of ids) {
    if (id === null) continue
    const targets = links
      .filter((link) => link.from === id && link.to !== id)
      .map((link) => link.to)
    if (targets.length === 0) {
      lines.push([{ box: id }, " no depende de nada"])
      continue
    }
    const line: TextPart[] = [{ box: id }, " depende de "]
    targets.forEach((target, index) => {
      if (index > 0) line.push(", ")
      line.push({ box: target })
    })
    lines.push(line)
  }
  for (const cycle of cycles) {
    const line: TextPart[] = ["Ciclo: "]
    for (const id of [...cycle, cycle[0] ?? ""]) {
      if (line.length > 1) line.push(" → ")
      line.push({ box: id })
    }
    lines.push(line)
  }
  return [{ kind: "list", ordered: false, items: lines }]
}

export const dependency: TypeModule = {
  name: "dependency",
  label: "Un grafo de dependencias",
  keys: ["nodes", "deps"],
  variants: [],
  schema,
  read: (data, tools) => read(data, tools),
}
