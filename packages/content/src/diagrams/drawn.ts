import type { z } from "zod"
import type { Entity } from "#contract/catalog/read"
import {
  badgeWidth,
  chainGap,
  fit,
  tableHeight,
  tagWidth,
  textWidth,
} from "#diagrams/measure"
import {
  accentPaths,
  type Diagram,
  type DiagramBox,
  type DiagramContext,
  type DiagramEdge,
  type DiagramNote,
  type DiagramRow,
  type DiagramZone,
  type Point,
} from "#diagrams/model"
import {
  joinPath,
  listOf,
  numberOr,
  optional,
  optionalText,
  positive,
  type Report,
  requiredText,
  salvaged,
  subLines,
  unknownKeys,
} from "#diagrams/report"
import {
  CHAIN_KEYS,
  COMMON_KEYS,
  DRAWN_KEYS,
  diagramSchemas,
  type EdgeKind,
  type Hue,
  type NodeKind,
  type Shape,
} from "#diagrams/schema"
import { checkAccents } from "#diagrams/types/kit/budget"
import { entityOf, linkOf } from "#diagrams/types/kit/items"
import { selfLoop } from "#diagrams/types/kit/links"

// A drawn diagram, in the format of the reference site's scheme drawer
// (`lib.mjs`): the content places every box, arrow and zone, or writes a
// chain of items laid out in one row. The platform checks them against the
// catalog, the pages and each other, and measures the text as `lib.mjs` did,
// reporting what does not fit.

const schemas = diagramSchemas()

/** A drawn diagram, in `lib.mjs`'s format: the content places every box. */
export function drawnDiagram(
  id: string,
  data: Record<string, unknown>,
  context: DiagramContext,
  report: Report
): Diagram {
  const chain = "items" in data
  const formKeys: readonly string[] = chain ? CHAIN_KEYS : DRAWN_KEYS
  const keys: readonly string[] = [...COMMON_KEYS, ...formKeys]
  unknownKeys(data, keys, "un diagrama", report)
  const title = requiredText(data.title, "title", report, id)
  const description = requiredText(data.desc, "desc", report, "")
  const kindNames = optional(
    schemas.kindNames,
    data.kindNames,
    "kindNames",
    report
  )
  const edgeNames = optional(
    schemas.edgeNames,
    data.edgeNames,
    "edgeNames",
    report
  )
  const badgeName = optionalText(data.badgeName, "badgeName", report)
  const shapes = optional(schemas.shapes, data.shapes, "shapes", report)
  const colorEdges = data.colorEdges === true
  if (data.colorEdges !== undefined && typeof data.colorEdges !== "boolean")
    report("colorEdges", "Es true o false")

  const drawing = chain
    ? chainDrawing(data, report)
    : drawnDrawing(data, report)
  const kindShapes = shapesOf(shapes)
  const nodes = boxesOf(
    drawing.boxes,
    drawing.zones,
    kindShapes,
    context,
    report
  )
  const edges = edgesOf(drawing.edges, nodes, drawing.zones, colorEdges, report)
  measure(nodes, edges, report)
  checkAccents(accentsOf(nodes, edges), report)
  const entities: Entity[] = []
  for (const { box } of nodes)
    if (box.entity !== null) entities.push(box.entity)
  return {
    id,
    title,
    description,
    size: drawing.size,
    nodes: nodes.map((node) => node.box),
    edges,
    zones: drawing.zones,
    notes: drawing.notes,
    kindNames: kindNames ?? {},
    edgeNames: edgeNames ?? {},
    badgeName,
    shapes: kindShapes,
    type: null,
    under: [],
    over: [],
    legend: null,
    text: null,
    entities,
    illustration: null,
  }
}

/**
 * How many things of a drawn diagram carry the accent: each focal box, and
 * each main path, a run of accent arrows joined end to end counting once.
 */
function accentsOf(
  boxes: readonly ReadBox[],
  edges: readonly DiagramEdge[]
): number {
  const focal = boxes.filter(({ box }) => box.kind === "focal").length
  return focal + accentPaths(edges.filter((edge) => edge.kind === "accent"))
}

type WrittenBox = z.infer<typeof schemas.item> & {
  x: number
  y: number
  w: number
}
type WrittenEdge = z.infer<typeof schemas.edge>

/** What a diagram's form gives, before checking what it points at. */
type Drawing = {
  size: { width: number; height: number } | null
  /** Each box with the field path it was written at. */
  boxes: { at: string; written: WrittenBox }[]
  edges: { at: string; index: number; written: WrittenEdge }[]
  zones: DiagramZone[]
  notes: DiagramNote[]
}

function drawnDrawing(data: Record<string, unknown>, report: Report): Drawing {
  const width = positive(data.width, "width", report)
  const height = positive(data.height, "height", report)
  const size = width === null || height === null ? null : { width, height }
  const boxes: Drawing["boxes"] = []
  listOf(data.nodes, "nodes", report, true).forEach((value, index) => {
    const at = `nodes.${index}`
    const written = salvaged(schemas.box, value, at, ["x", "y", "w"], report)
    if (written === null) return
    if (written.h === undefined && written.rows === undefined) {
      report(`${at}.h`, "Falta: una caja que no es una tabla lleva h")
      return
    }
    boxes.push({ at, written })
  })
  const edges: Drawing["edges"] = []
  listOf(data.edges, "edges", report, false).forEach((value, index) => {
    const at = `edges.${index}`
    const written = salvaged(schemas.edge, value, at, [], report)
    if (written !== null) edges.push({ at, index, written })
  })
  return {
    size,
    boxes,
    edges,
    zones: zonesOf(data.zones, report),
    notes: notesOf(data.notes, report),
  }
}

/**
 * A chain: its items in one row from x 24, each as wide as its longest line
 * unless it says `w`, an arrow across each gap, the drawing sized to them,
 * as `lib.mjs`'s `chain()` lays them.
 */
function chainDrawing(data: Record<string, unknown>, report: Report): Drawing {
  const y = numberOr(data.y, "y", report, 40)
  const h = numberOr(data.h, "h", report, 72)
  const links = optional(schemas.chainLinks, data.links, "links", report) ?? []
  const accent = optional(schemas.indexes, data.accent, "accent", report) ?? []
  const dash = optional(schemas.indexes, data.dash, "dash", report) ?? []
  const items: { at: string; written: z.infer<typeof schemas.item> }[] = []
  listOf(data.items, "items", report, true).forEach((value, index) => {
    const at = `items.${index}`
    const written = salvaged(schemas.item, value, at, [], report)
    if (written !== null) items.push({ at, written })
  })
  const boxes: Drawing["boxes"] = []
  const edges: Drawing["edges"] = []
  let x = 24
  items.forEach(({ at, written }, position) => {
    const w = itemWidth(written)
    boxes.push({ at, written: { h, ...written, x, y, w } })
    x += w
    const next = items[position + 1]
    if (next === undefined) return
    const label = links[position] ?? null
    const gap = chainGap(label)
    const cy = y + h / 2
    edges.push({
      at: `links.${position}`,
      index: position,
      written: {
        points: [
          [x, cy],
          [x + gap, cy],
        ],
        from: written.id,
        to: next.written.id,
        kind: chainEdgeKind(position, accent, dash),
        label: label ?? undefined,
        at: [x + gap / 2, cy - 10],
      },
    })
    x += gap
  })
  return {
    size: { width: x + 24, height: y + h + 24 },
    boxes,
    edges,
    zones: [],
    notes: [],
  }
}

function itemWidth(item: z.infer<typeof schemas.item>): number {
  if (item.w !== undefined) return item.w
  return fit(item.name ?? "", subLines(item.sub), item.tag ?? null)
}

function chainEdgeKind(
  position: number,
  accent: readonly number[],
  dash: readonly number[]
): EdgeKind {
  if (accent.includes(position)) return "accent"
  if (dash.includes(position)) return "dash"
  return "default"
}

function zonesOf(value: unknown, report: Report): DiagramZone[] {
  const zones: DiagramZone[] = []
  const ids = new Set<string>()
  listOf(value, "zones", report, false).forEach((item, index) => {
    const at = `zones.${index}`
    const zone = salvaged(
      schemas.zone,
      item,
      at,
      ["x", "y", "w", "h", "label"],
      report
    )
    if (zone === null) return
    let id = zone.id ?? null
    if (id !== null && ids.has(id)) {
      report(`${at}.id`, `\`${id}\` ya es el id de otra zona`)
      id = null
    }
    if (id !== null) ids.add(id)
    zones.push({
      id,
      x: zone.x,
      y: zone.y,
      w: zone.w,
      h: zone.h,
      label: zone.label,
      hue: zone.hue ?? null,
    })
  })
  return zones
}

function notesOf(value: unknown, report: Report): DiagramNote[] {
  const notes: DiagramNote[] = []
  listOf(value, "notes", report, false).forEach((item, index) => {
    const note = salvaged(
      schemas.note,
      item,
      `notes.${index}`,
      ["x", "y", "text"],
      report
    )
    if (note === null) return
    notes.push({
      x: note.x,
      y: note.y,
      text: note.text,
      anchor: note.anchor ?? "start",
    })
  })
  return notes
}

/** A box checked against the catalog, the pages and the other boxes. */
type ReadBox = { at: string; box: DiagramBox }

function boxesOf(
  written: Drawing["boxes"],
  zones: readonly DiagramZone[],
  shapes: Partial<Record<NodeKind, Shape>>,
  context: DiagramContext,
  report: Report
): ReadBox[] {
  const zoneHues = new Map<string, Hue | null>()
  for (const zone of zones)
    if (zone.id !== null) zoneHues.set(zone.id, zone.hue)
  const ids = new Set<string>()
  const boxes = written.map(({ at, written: box }) => {
    let id = box.id ?? null
    if (id !== null && ids.has(id)) {
      report(`${at}.id`, `\`${id}\` ya es el id de otra caja`)
      id = null
    }
    if (id !== null) ids.add(id)
    const entity = entityOf(box.entity, context.catalog, `${at}.entity`, report)
    const link = linkOf(box, entity, context.pages, at, report)
    const zone = zoneOf(box.zone, zoneHues, `${at}.zone`, report)
    const kind = box.kind ?? "service"
    const rows = rowsOf(box.rows)
    let ops = rowsOf(box.ops)
    if (ops !== null && rows === null) {
      report(`${at}.ops`, "ops va bajo las filas de una tabla: lleva rows")
      ops = null
    }
    return {
      at,
      box: {
        id,
        x: box.x,
        y: box.y,
        w: box.w,
        h: heightOf(box.h, rows, ops, box.more),
        kind,
        tag: box.tag ?? null,
        name: boxName(box.name, entity, id, at, report),
        sub: subLines(box.sub),
        shape: shapeOf(box.shape, shapes[kind]),
        hue: hueOf(box.hue, zone, zoneHues),
        zone,
        info: box.info ?? null,
        trace: box.trace === true,
        needs: box.needs ?? [],
        entity,
        link,
        rows,
        ops,
        more: box.more ?? null,
      },
    }
  })
  for (const { at, box } of boxes) {
    const known = box.needs.filter((need) => ids.has(need))
    for (const need of box.needs)
      if (!ids.has(need))
        report(`${at}.needs`, `\`${need}\` no es ninguna de las cajas`)
    box.needs = known
  }
  return boxes
}

function zoneOf(
  written: string | undefined,
  zones: ReadonlyMap<string, Hue | null>,
  at: string,
  report: Report
): string | null {
  if (written === undefined) return null
  if (zones.has(written)) return written
  report(at, `\`${written}\` no es ninguna de las zonas`)
  return null
}

function boxName(
  written: string | undefined,
  entity: Entity | null,
  id: string | null,
  at: string,
  report: Report
): string {
  if (written !== undefined) return written
  if (entity !== null) return entity.label
  if (id === null) {
    report(at, "Lleva `name` o `entity`")
    return ""
  }
  return id
}

function heightOf(
  h: number | undefined,
  rows: DiagramRow[] | null,
  ops: DiagramRow[] | null,
  more: string | undefined
): number {
  if (h !== undefined) return h
  if (rows === null) return 0
  return tableHeight(rows.length, more !== undefined, opsCount(ops))
}

function opsCount(ops: readonly DiagramRow[] | null): number {
  if (ops === null) return 0
  return ops.length
}

function rowsOf(written: WrittenBox["rows"]): DiagramRow[] | null {
  if (written === undefined) return null
  return written.map((row) => ({
    key: row.key ?? null,
    name: row.name,
    type: row.type ?? null,
  }))
}

function shapeOf(
  own: Shape | undefined,
  byKind: Shape | undefined
): Shape | null {
  if (own !== undefined) return own
  return byKind ?? null
}

function hueOf(
  own: Hue | undefined,
  zone: string | null,
  zones: ReadonlyMap<string, Hue | null>
): Hue | null {
  if (own !== undefined) return own
  if (zone === null) return null
  return zones.get(zone) ?? null
}

function shapesOf(
  shapes: Partial<Record<NodeKind, Shape>> | undefined
): Partial<Record<NodeKind, Shape>> {
  if (shapes === undefined) return {}
  return shapes
}

function edgesOf(
  written: Drawing["edges"],
  boxes: readonly ReadBox[],
  zones: readonly DiagramZone[],
  colorEdges: boolean,
  report: Report
): DiagramEdge[] {
  const byId = new Map<string, DiagramBox>()
  for (const { box } of boxes) if (box.id !== null) byId.set(box.id, box)
  const zoneIds = new Set<string>()
  for (const zone of zones) if (zone.id !== null) zoneIds.add(zone.id)
  const edges: DiagramEdge[] = []
  for (const { at, index, written: edge } of written) {
    const reportAt: Report = (field, message) =>
      report(joinPath(at, field), message)
    const from = knownEnd(edge.from, byId, (end) =>
      reportAt("from", `\`${end}\` no es ninguna de las cajas`)
    )
    const to = knownEnd(edge.to, byId, (end) =>
      reportAt("to", `\`${end}\` no es ninguna de las cajas`)
    )
    let toZone = knownEnd(edge.toZone, zoneIds, (end) =>
      reportAt("toZone", `\`${end}\` no es ninguna de las zonas`)
    )
    if (to !== null && toZone !== null) {
      reportAt("", "Lleva `to` o `toZone`, no los dos")
      toZone = null
    }
    const kind = edge.kind ?? "default"
    const hue = edgeHue(kind, edge.hue, colorEdges, from, byId)
    const route = edge.route ?? "orthogonal"
    const base = {
      index,
      from,
      to,
      toZone,
      kind,
      anchor: edge.anchor ?? "middle",
      hue,
      info: edge.info ?? null,
      noHead: edge.noHead === true,
      head: edge.head ?? "arrow",
      route,
    }
    if (edge.badge !== undefined) {
      if (edge.points !== undefined)
        reportAt(
          "points",
          "Una insignia (badge) no lleva points: se dibuja en su caja from"
        )
      if (from === null || to === null) {
        reportAt(
          "",
          "Una insignia (badge) lleva from y to, dos cajas que existan"
        )
        continue
      }
      edges.push({
        ...base,
        points: null,
        label: edge.label ?? null,
        at: null,
        badge: edge.badge,
      })
      continue
    }
    const loopBox = selfLoopBox(edge, from, to, byId)
    if (loopBox !== null) {
      const loop = selfLoop(loopBox)
      edges.push({
        ...base,
        route: "orthogonal",
        points: loop.points,
        label: edge.label ?? null,
        at: loop.at,
        anchor: "start",
        badge: null,
      })
      continue
    }
    if (edge.points === undefined) {
      reportAt("points", "Falta: una flecha lleva points, o badge")
      continue
    }
    const diagonal = route === "curve" ? null : diagonalOf(edge.points)
    if (diagonal !== null) {
      reportAt("points", `tramo en diagonal ${diagonal}`)
      continue
    }
    let label = edge.label ?? null
    if (label !== null && edge.at === undefined) {
      reportAt("", "Una etiqueta (label) necesita at: dónde va")
      label = null
    }
    edges.push({
      ...base,
      points: edge.points,
      label,
      at: edge.at ?? null,
      badge: null,
    })
  }
  return edges
}

/** The box an arrow loops on: same `from` and `to`, and no `points`. */
function selfLoopBox(
  edge: WrittenEdge,
  from: string | null,
  to: string | null,
  boxes: ReadonlyMap<string, DiagramBox>
): DiagramBox | null {
  if (edge.points !== undefined || from === null || from !== to) return null
  return boxes.get(from) ?? null
}

function knownEnd(
  end: string | undefined,
  known: { has: (id: string) => boolean },
  unknown: (end: string) => void
): string | null {
  if (end === undefined) return null
  if (known.has(end)) return end
  unknown(end)
  return null
}

function edgeHue(
  kind: EdgeKind,
  own: Hue | undefined,
  colorEdges: boolean,
  from: string | null,
  boxes: ReadonlyMap<string, DiagramBox>
): Hue | null {
  if (kind !== "default") return null
  if (own !== undefined) return own
  if (!colorEdges || from === null) return null
  return boxes.get(from)?.hue ?? null
}

/** The first segment that is neither horizontal nor vertical, as text. */
function diagonalOf(points: readonly Point[]): string | null {
  for (let i = 1; i < points.length; i++) {
    const before = points[i - 1]
    const point = points[i]
    if (before === undefined || point === undefined) continue
    const [px, py] = before
    const [x, y] = point
    if (px !== x && py !== y) return `${px},${py} → ${x},${y}`
  }
  return null
}

/** The problems `lib.mjs` warned about: text and badges that do not fit. */
function measure(
  boxes: readonly ReadBox[],
  edges: readonly DiagramEdge[],
  report: Report
) {
  for (const { at, box } of boxes) {
    if (box.rows === null) measurePlain(box, at, report)
    else measureTable(box, box.rows, at, report)
    const badges = edges.filter(
      (edge) => edge.badge !== null && edge.from === box.id
    )
    if (box.id === null || badges.length === 0) continue
    let right = box.x + box.w - 8
    for (const edge of badges) right -= badgeWidth(edge.badge ?? "") + 3
    right += 3
    if (right < box.x + 8 + tagRoom(box.tag) + 4)
      report(at, `las insignias de "${box.name}" no caben junto a su etiqueta`)
  }
}

function tagRoom(tag: string | null): number {
  if (tag === null) return 0
  return tagWidth(tag)
}

function measurePlain(box: DiagramBox, at: string, report: Report) {
  const lines: [string, number, "sans" | "mono"][] = [
    [box.name, 12, "sans"],
    ...box.sub.map((line): [string, number, "mono"] => [line, 9, "mono"]),
  ]
  for (const [line, size, font] of lines) {
    const width = textWidth(line, size, font)
    if (width > box.w - 16)
      report(at, `"${line}" (${Math.round(width)}px) no cabe en ${box.w}px`)
  }
}

function measureTable(
  box: DiagramBox,
  rows: readonly DiagramRow[],
  at: string,
  report: Report
) {
  const tag = box.tag === null ? 0 : tagWidth(box.tag) + 8
  if (textWidth(box.name, 12, "sans") + tag > box.w - 24)
    report(at, `"${box.name}" no cabe en ${box.w}px`)
  for (const row of [...rows, ...(box.ops ?? [])]) {
    const width =
      40 +
      textWidth(row.name, 9, "mono") +
      8 +
      textWidth(row.type ?? "", 8, "mono")
    if (width > box.w - 20)
      report(at, `la columna "${row.name}" no cabe en ${box.w}px`)
  }
}
