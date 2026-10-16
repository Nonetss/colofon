// What hovering a part of a diagram lights up, and the card that says what
// it is, worked out on the diagram's graph alone (no DOM), as the reference
// site's `esquemas.ts` does: a box lights the arrows that touch it and their
// far ends, plus every box that falls with it (`needs`); a box with `trace`
// lights everything reached from it along the accent arrows; an arrow or a
// badge lights its ends; a zone title lights the zone's boxes and arrows.
// A typed diagram's data mark (a bar, a dot, a cell…) lights its series and
// says its label and value; a legend entry lights its series.
// `diagram-highlights.ts` reads the graph from the drawing and applies it.

export type GraphBox = {
  id: string
  name: string
  /** The text of its tag, as drawn. */
  tag: string
  info: string
  zone: string | null
  trace: boolean
  /** The ids of the boxes it depends on. */
  needs: string[]
  /** A data mark's series, `null` for none. */
  series: string | null
  /** A data mark's value, as drawn ("1.200 usuarios"); `null` for a box. */
  value: string | null
}

export type GraphEdge = {
  /** Its `data-edge`, shared by its line, head, hit band, label or chip. */
  id: string
  from: string | null
  to: string | null
  toZone: string | null
  label: string
  info: string
  accent: boolean
}

export type Graph = {
  boxes: ReadonlyMap<string, GraphBox>
  edges: readonly GraphEdge[]
  /** Each zone's label, by id. */
  zones: ReadonlyMap<string, string>
}

/** `lists`: a caption and its items each; a tab splits off an item's label. */
export type Card = {
  title: string
  tag: string
  text: string
  lists: string[][]
}

/** What to light: boxes, arrows, the zone whose frame lights, the fallen. */
export type Highlight = {
  boxes: Set<string>
  edges: Set<string>
  zone: string | null
  /** Boxes that fall with the hovered one, lit and marked. */
  down: Set<string>
  card: Card
}

export function nameOf(graph: Graph, id: string | null): string {
  if (id === null) return ""
  const box = graph.boxes.get(id)
  if (box === undefined) return id
  return box.name
}

function zoneLabel(graph: Graph, id: string | null): string {
  if (id === null) return ""
  const label = graph.zones.get(id)
  if (label === undefined) return id
  return label
}

/** The name of where an arrow goes: its box, or its whole zone. */
function targetName(graph: Graph, edge: GraphEdge): string {
  if (edge.to !== null) return nameOf(graph, edge.to)
  return zoneLabel(graph, edge.toZone)
}

/** The ids of the boxes of `zone`. */
export function inZone(graph: Graph, zone: string): string[] {
  const ids: string[] = []
  for (const box of graph.boxes.values())
    if (box.zone === zone) ids.push(box.id)
  return ids
}

/** Does the arrow touch box `id` (also when it ends on its whole zone)? */
export function touches(graph: Graph, edge: GraphEdge, id: string): boolean {
  if (edge.from === id || edge.to === id) return true
  if (edge.toZone === null) return false
  return graph.boxes.get(id)?.zone === edge.toZone
}

/** The box ids at the far end of an arrow, seen from `id`. */
export function farEnds(graph: Graph, edge: GraphEdge, id: string): string[] {
  if (edge.from !== id) {
    if (edge.from === null) return []
    return [edge.from]
  }
  if (edge.to !== null) return [edge.to]
  if (edge.toZone !== null) return inZone(graph, edge.toZone)
  return []
}

/**
 * Every box that falls with `id`: those that need it, and those that need
 * them, each with the box it falls through.
 */
export function fallsWith(graph: Graph, id: string): Map<string, string> {
  const down = new Map<string, string>()
  const queue = [id]
  for (let i = 0; i < queue.length; i++) {
    const at = queue[i]
    if (at === undefined) continue
    for (const box of graph.boxes.values()) {
      if (box.id === id || down.has(box.id) || !box.needs.includes(at)) continue
      down.set(box.id, at)
      queue.push(box.id)
    }
  }
  return down
}

/**
 * Everything reached from `id` along the accent arrows, in the order they
 * are reached, plus its own other arrows so nothing it touches stays dark.
 */
export function traceFrom(
  graph: Graph,
  id: string
): { boxes: Set<string>; edges: GraphEdge[] } {
  const boxes = new Set([id])
  const edges: GraphEdge[] = []
  const queue = [id]
  for (let i = 0; i < queue.length; i++) {
    const at = queue[i]
    if (at === undefined) continue
    for (const edge of graph.edges) {
      if (!edge.accent || edge.from !== at || edges.includes(edge)) continue
      edges.push(edge)
      for (const next of farEnds(graph, edge, at)) {
        if (boxes.has(next)) continue
        boxes.add(next)
        queue.push(next)
      }
    }
  }
  for (const edge of graph.edges) {
    if (edges.includes(edge) || !touches(graph, edge, id)) continue
    edges.push(edge)
    for (const next of farEnds(graph, edge, id)) boxes.add(next)
  }
  return { boxes, edges }
}

function idsOf(edges: readonly GraphEdge[]): Set<string> {
  return new Set(edges.map((edge) => edge.id))
}

/** An item of a card's list, with its label after a tab. */
function item(text: string, label: string): string {
  if (label === "") return text
  return `${text}\t${label}`
}

/** What hovering the arrow or badge `edgeId` lights up. */
export function edgeHighlight(graph: Graph, edgeId: string): Highlight | null {
  const edge = graph.edges.find((candidate) => candidate.id === edgeId)
  if (edge === undefined) return null
  const boxes = new Set<string>()
  if (edge.from !== null) boxes.add(edge.from)
  if (edge.to !== null) boxes.add(edge.to)
  if (edge.toZone !== null)
    for (const id of inZone(graph, edge.toZone)) boxes.add(id)
  return {
    boxes,
    edges: new Set([edge.id]),
    zone: null,
    down: new Set(),
    card: {
      title: `${nameOf(graph, edge.from)} → ${targetName(graph, edge)}`,
      tag: edge.label,
      text: edge.info,
      lists: [],
    },
  }
}

/** What hovering the title of `zone` lights up. */
export function zoneHighlight(graph: Graph, zone: string): Highlight {
  const boxes = new Set(inZone(graph, zone))
  const touching = graph.edges.filter((edge) =>
    [...boxes].some((id) => touches(graph, edge, id))
  )
  return {
    boxes,
    edges: idsOf(touching),
    zone,
    down: new Set(),
    card: {
      title: zoneLabel(graph, zone),
      tag: `${boxes.size} piezas`,
      text: [...boxes].map((id) => nameOf(graph, id)).join(" · "),
      lists: [],
    },
  }
}

/** What hovering box `id` lights up. */
export function boxHighlight(graph: Graph, id: string): Highlight | null {
  const box = graph.boxes.get(id)
  if (box === undefined) return null
  if (box.trace) return traceHighlight(graph, box)
  const mine = graph.edges.filter((edge) => touches(graph, edge, id))
  const near = new Set([id])
  for (const edge of mine)
    for (const other of farEnds(graph, edge, id)) near.add(other)
  const down = fallsWith(graph, id)
  for (const fallen of down.keys()) near.add(fallen)
  const lines = mine.map((edge) => connectionLine(graph, edge, id))
  const needs = box.needs.map((other) => nameOf(graph, other))
  const falls = [...down].map(([other, via]) => {
    if (via === id) return nameOf(graph, other)
    return item(nameOf(graph, other), `por ${nameOf(graph, via)}`)
  })
  const lists: string[][] = []
  if (lines.length > 0) lists.push(["Conexiones", ...lines])
  if (needs.length > 0) lists.push(["Depende de", ...needs])
  if (falls.length > 0) lists.push(["Si se cae, afecta a", ...falls])
  return {
    boxes: near,
    edges: idsOf(mine),
    zone: null,
    down: new Set(down.keys()),
    card: { title: box.name, tag: box.tag, text: box.info, lists },
  }
}

/** "→ other" for an arrow that leaves `id`, "← other" for one that arrives. */
function connectionLine(graph: Graph, edge: GraphEdge, id: string): string {
  if (edge.from === id) return item(`→ ${targetName(graph, edge)}`, edge.label)
  return item(`← ${nameOf(graph, edge.from)}`, edge.label)
}

function traceHighlight(graph: Graph, box: GraphBox): Highlight {
  const { boxes, edges } = traceFrom(graph, box.id)
  const steps = edges
    .filter((edge) => edge.accent)
    .map((edge) => `${nameOf(graph, edge.from)} → ${targetName(graph, edge)}`)
  const lists: string[][] = []
  if (steps.length > 0) lists.push(["Camino principal", ...steps])
  return {
    boxes,
    edges: idsOf(edges),
    zone: null,
    down: new Set(),
    card: { title: box.name, tag: box.tag, text: box.info, lists },
  }
}

/** What hovering the data mark `id` lights up: it and the rest of its series. */
export function markHighlight(graph: Graph, id: string): Highlight | null {
  const mark = graph.boxes.get(id)
  if (mark === undefined || mark.value === null) return null
  const boxes = new Set([id])
  if (mark.series !== null)
    for (const other of seriesMarks(graph, mark.series)) boxes.add(other)
  const text = [mark.value, mark.info].filter((part) => part !== "").join(" · ")
  return {
    boxes,
    edges: new Set(),
    zone: null,
    down: new Set(),
    card: { title: mark.name, tag: mark.series ?? "", text, lists: [] },
  }
}

/** What hovering the legend entry of `series` lights up: its marks. */
export function seriesHighlight(graph: Graph, series: string): Highlight {
  const boxes = new Set(seriesMarks(graph, series))
  const count = boxes.size === 1 ? "1 valor" : `${boxes.size} valores`
  return {
    boxes,
    edges: new Set(),
    zone: null,
    down: new Set(),
    card: {
      title: series,
      tag: count,
      text: "",
      lists: [],
    },
  }
}

function seriesMarks(graph: Graph, series: string): string[] {
  const ids: string[] = []
  for (const box of graph.boxes.values())
    if (box.series === series) ids.push(box.id)
  return ids
}
