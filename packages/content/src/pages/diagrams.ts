import type { Dirent } from "node:fs"
import { readdir, readFile } from "node:fs/promises"
import path from "node:path"
import type { Element, ElementContent } from "hast"
import type { z } from "zod"
import type { Catalog, Entity } from "#catalog"
import { DIAGRAMS_DIR, parseJson, spanishErrors } from "#load"
import { entityPath } from "#pages/catalog-paths"
import {
  badgeWidth,
  chainGap,
  fit,
  tableHeight,
  tagWidth,
  textWidth,
} from "#pages/diagram-measure"
import {
  type Anchor,
  CHAIN_KEYS,
  COMMON_KEYS,
  DRAWN_KEYS,
  diagramSchemas,
  type EdgeKind,
  type Hue,
  ID_PATTERN,
  type NodeKind,
  type Shape,
} from "#pages/diagram-schema"
import { diagramSvg } from "#pages/diagram-svg"
import { entityPagePath } from "#pages/entities"
import type { PageProblem } from "#pages/types"

// The diagrams of a repository: one `diagramas/<id>.json` each, shown in any
// page with `<Diagram id="…" />`, in the format of the reference site's
// scheme drawer (`lib.mjs`, see `diagram-schema.ts`). The content places
// every box, arrow and zone; the platform checks them, reports every problem
// on the file with its field path (`nodes.3.entity`) and keeps whatever is
// valid, so one bad box or arrow never hides the rest. It also measures the
// text as `lib.mjs` did and reports what does not fit. Then it draws the
// diagram as an SVG (`diagram-svg.ts`), keeping its zones and connections as
// text for screen readers and `llm.txt`.

export type DiagramRow = {
  key: string | null
  name: string
  type: string | null
}

export type DiagramBox = {
  id: string | null
  x: number
  y: number
  w: number
  /** For a table, the height its rows take. */
  h: number
  kind: NodeKind
  tag: string | null
  name: string
  sub: string[]
  /** Its own shape, or the one `shapes` gives its kind. */
  shape: Shape | null
  /** Its own hue, or its zone's. */
  hue: Hue | null
  zone: string | null
  info: string | null
  trace: boolean
  needs: string[]
  /** The catalog entity it stands for, if any. */
  entity: Entity | null
  /** The page path it links to: its entity's page, or its `page`. */
  link: string | null
  /** A table's columns, `null` for a plain box. */
  rows: DiagramRow[] | null
  more: string | null
}

export type Point = readonly [number, number]

export type DiagramEdge = {
  /** Its position in `edges`, which ties its line, label and hit band. */
  index: number
  /** `null` for a badge. */
  points: Point[] | null
  from: string | null
  to: string | null
  toZone: string | null
  kind: EdgeKind
  label: string | null
  at: Point | null
  anchor: Anchor
  /** A default arrow's own hue, or with `colorEdges` its `from` box's. */
  hue: Hue | null
  info: string | null
  noHead: boolean
  badge: string | null
}

export type DiagramZone = {
  id: string | null
  x: number
  y: number
  w: number
  h: number
  label: string
  hue: Hue | null
}

export type DiagramNote = { x: number; y: number; text: string; anchor: Anchor }

export type Diagram = {
  id: string
  title: string
  description: string
  /** The drawing area, the legend going under it; `null` when not drawable. */
  size: { width: number; height: number } | null
  nodes: DiagramBox[]
  edges: DiagramEdge[]
  zones: DiagramZone[]
  notes: DiagramNote[]
  kindNames: Partial<Record<NodeKind, string>>
  edgeNames: Partial<Record<EdgeKind, string>>
  badgeName: string | null
  /** The shape of each kind of box, for its legend sample. */
  shapes: Partial<Record<NodeKind, Shape>>
}

/** A diagram file read: what could be kept of it, and what went wrong. */
export type DiagramFile = {
  id: string
  /** Path relative to the content root (`diagramas/red.json`). */
  file: string
  /** `null` when the file is not JSON or not an object. */
  diagram: Diagram | null
  problems: PageProblem[]
}

/** What a diagram's boxes can point at. */
export type DiagramContext = {
  catalog: Catalog
  /** The repository's page paths. */
  pages: ReadonlySet<string>
}

const EXTENSION = ".json"

/** Every diagram of the repository at `root`, by id, in id order. */
export async function readDiagrams(
  root: string,
  context: DiagramContext
): Promise<{ diagrams: Map<string, DiagramFile>; problems: PageProblem[] }> {
  const diagrams = new Map<string, DiagramFile>()
  const problems: PageProblem[] = []
  for (const entry of await listDir(path.join(root, DIAGRAMS_DIR))) {
    if (!entry.isFile()) continue
    const file = `${DIAGRAMS_DIR}/${entry.name}`
    const yaml = /\.ya?ml$/.exec(entry.name)
    if (yaml !== null) {
      const id = entry.name.slice(0, yaml.index)
      problems.push({
        file,
        line: null,
        message: `Los diagramas se escriben ahora en JSON: pásalo a ${DIAGRAMS_DIR}/${id}${EXTENSION}`,
      })
      continue
    }
    if (!entry.name.endsWith(EXTENSION)) continue
    const id = entry.name.slice(0, -EXTENSION.length)
    if (!ID_PATTERN.test(id)) {
      problems.push({
        file,
        line: null,
        message:
          "El nombre del fichero es el id del diagrama: en minúsculas, sin acentos y con guiones (red-de-casa)",
      })
      continue
    }
    const text = await readFile(path.join(root, file), "utf8")
    const read = readDiagram(id, file, text, context)
    diagrams.set(id, read)
    problems.push(...read.problems)
  }
  return { diagrams, problems }
}

type Report = (at: string, message: string) => void

const schemas = diagramSchemas()

/** Reads one diagram file's text. */
export function readDiagram(
  id: string,
  file: string,
  text: string,
  context: DiagramContext
): DiagramFile {
  const problems: PageProblem[] = []
  const report: Report = (at, message) =>
    problems.push({ file, line: null, message: withPath(at, message) })
  const jsonProblems: { file: string; message: string }[] = []
  const data = parseJson(text, file, jsonProblems)
  for (const problem of jsonProblems)
    problems.push({ file, line: null, message: problem.message })
  if (data === undefined) return { id, file, diagram: null, problems }
  if (!isRecord(data)) {
    report("", "Un diagrama es un objeto con title, desc y nodes (o items)")
    return { id, file, diagram: null, problems }
  }

  const chain = "items" in data
  const formKeys: readonly string[] = chain ? CHAIN_KEYS : DRAWN_KEYS
  const keys: readonly string[] = [...COMMON_KEYS, ...formKeys]
  for (const key of Object.keys(data)) {
    if (!keys.includes(key))
      report(
        "",
        `\`${key}\` no es una clave de un diagrama (${keys.join(", ")})`
      )
  }
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
  return {
    id,
    file,
    diagram: {
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
    },
    problems,
  }
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
    return {
      at,
      box: {
        id,
        x: box.x,
        y: box.y,
        w: box.w,
        h: heightOf(box.h, rows, box.more),
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

function entityOf(
  written: string | undefined,
  catalog: Catalog,
  at: string,
  report: Report
): Entity | null {
  if (written === undefined) return null
  const [typeId = "", entityId = ""] = written.split("/")
  const entity = catalog.get(typeId)?.entities.get(entityId)
  if (entity === undefined) {
    report(at, `\`${written}\` no es ninguna entidad del catálogo`)
    return null
  }
  return entity
}

function linkOf(
  box: WrittenBox,
  entity: Entity | null,
  pages: ReadonlySet<string>,
  at: string,
  report: Report
): string | null {
  if (box.entity !== undefined && box.page !== undefined)
    report(at, "Lleva `entity` o `page`, no los dos")
  if (entity !== null) return entityPagePath(entity)
  if (box.entity !== undefined || box.page === undefined) return null
  if (!pages.has(box.page)) {
    report(`${at}.page`, `\`${box.page}\` no es ninguna página de docs/`)
    return null
  }
  return box.page
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
  more: string | undefined
): number {
  if (h !== undefined) return h
  if (rows === null) return 0
  return tableHeight(rows.length, more !== undefined)
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
    if (edge.points === undefined) {
      reportAt("points", "Falta: una flecha lleva points, o badge")
      continue
    }
    const diagonal = diagonalOf(edge.points)
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
  for (const row of rows) {
    const width =
      40 +
      textWidth(row.name, 9, "mono") +
      8 +
      textWidth(row.type ?? "", 8, "mono")
    if (width > box.w - 20)
      report(at, `la columna "${row.name}" no cabe en ${box.w}px`)
  }
}

// ── Reading helpers ─────────────────────────────────────────────────────

function withPath(at: string, message: string): string {
  if (at === "") return message
  return `${at}: ${message}`
}

function joinPath(at: string, field: string): string {
  if (at === "") return field
  if (field === "") return at
  return `${at}.${field}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function requiredText(
  value: unknown,
  key: string,
  report: Report,
  fallback: string
): string {
  if (typeof value === "string" && value.trim() !== "") return value
  if (value === undefined) report(key, "Falta: es obligatorio")
  else report(key, "Es un texto")
  return fallback
}

function optionalText(
  value: unknown,
  key: string,
  report: Report
): string | null {
  if (value === undefined) return null
  if (typeof value === "string" && value.trim() !== "") return value
  report(key, "Es un texto")
  return null
}

function positive(value: unknown, key: string, report: Report): number | null {
  if (typeof value === "number" && value > 0) return value
  if (value === undefined) report(key, "Falta: es obligatorio")
  else report(key, "Es un número mayor que 0")
  return null
}

function numberOr(
  value: unknown,
  key: string,
  report: Report,
  fallback: number
): number {
  if (value === undefined) return fallback
  if (typeof value === "number") return value
  report(key, "Es un número")
  return fallback
}

/** A list field: its items, or none (reported) when it is not a list. */
function listOf(
  value: unknown,
  key: string,
  report: Report,
  required: boolean
): unknown[] {
  if (value === undefined) {
    if (required) report(key, "Falta: es una lista con al menos un elemento")
    return []
  }
  if (!Array.isArray(value)) {
    report(key, "Es una lista")
    return []
  }
  if (required && value.length === 0)
    report(key, "Es una lista con al menos un elemento")
  return value
}

function optional<T>(
  schema: z.ZodType<T>,
  value: unknown,
  key: string,
  report: Report
): T | undefined {
  if (value === undefined) return undefined
  const parsed = schema.safeParse(value, { error: spanishErrors })
  if (parsed.success) return parsed.data
  for (const issue of parsed.error.issues)
    report(joinPath(key, issueKey(issue)), issueMessage(issue))
  return undefined
}

/**
 * One part of a list (a box, an arrow…) checked by `schema`. Every problem
 * is reported; a part whose wrong fields are all optional is kept without
 * them, and one missing a `required` field is left out.
 */
function salvaged<T>(
  schema: z.ZodType<T>,
  value: unknown,
  at: string,
  required: readonly string[],
  report: Report
): T | null {
  const parsed = schema.safeParse(value, { error: spanishErrors })
  if (parsed.success) return parsed.data
  const wrong = new Set<string>()
  let whole = false
  for (const issue of parsed.error.issues) {
    report(joinPath(at, issueKey(issue)), issueMessage(issue))
    const key = issueKey(issue)
    if (key === "") whole = true
    else wrong.add(firstKey(key))
  }
  if (whole || !isRecord(value)) return null
  if (required.some((key) => wrong.has(key))) return null
  const kept = Object.fromEntries(
    Object.entries(value).filter(([key]) => !wrong.has(key))
  )
  const again = schema.safeParse(kept)
  if (again.success) return again.data
  return null
}

function firstKey(key: string): string {
  const [first = ""] = key.split(".")
  return first
}

/** Where an issue points; an unknown key points at that key. */
function issueKey(issue: z.core.$ZodIssue): string {
  const path = issue.path.map(String)
  if (issue.code === "unrecognized_keys") {
    const [first] = issue.keys
    if (first !== undefined) path.push(first)
  }
  return path.join(".")
}

function issueMessage(issue: z.core.$ZodIssue): string {
  if (issue.code === "unrecognized_keys")
    return `no es una clave que admita (${issue.keys.map((key) => `\`${key}\``).join(", ")})`
  return issue.message
}

function subLines(sub: string | string[] | undefined): string[] {
  if (sub === undefined) return []
  if (typeof sub === "string") return [sub]
  return sub
}

// ── The figure ──────────────────────────────────────────────────────────

/** For each entity's page path, the ids of the diagrams it is a box of. */
export function diagramsByEntity(
  diagrams: ReadonlyMap<string, DiagramFile>
): Map<string, string[]> {
  const found = new Map<string, string[]>()
  for (const { diagram } of diagrams.values()) {
    if (diagram === null) continue
    const entities = new Set<string>()
    for (const node of diagram.nodes) {
      if (node.entity !== null)
        entities.add(entityPath(node.entity.type, node.entity.id))
    }
    for (const entity of entities) {
      const list = found.get(entity)
      if (list === undefined) found.set(entity, [diagram.id])
      else list.push(diagram.id)
    }
  }
  return found
}

function element(
  tagName: string,
  properties: Element["properties"],
  children: ElementContent[]
): Element {
  return { type: "element", tagName, properties, children }
}

function text(value: string): ElementContent {
  return { type: "text", value }
}

/**
 * A diagram as a figure. Drawn, only the drawing shows: its caption and its
 * zones and connections as text stay in the tree, hidden from sight, for
 * screen readers and for the page's Markdown (`llm.txt`). Without a drawing
 * (no valid size), the caption and the text are what shows.
 */
export function diagramFigure(
  diagram: Diagram,
  routeOf: (pagePath: string) => string
): Element {
  const byId = new Map<string, DiagramBox>()
  for (const node of diagram.nodes)
    if (node.id !== null) byId.set(node.id, node)
  const name = (id: string): ElementContent[] => {
    const node = byId.get(id)
    if (node === undefined) return [text(id)]
    if (node.link === null) return [text(node.name)]
    return [element("a", { href: routeOf(node.link) }, [text(node.name)])]
  }
  const zoneLabel = (id: string): ElementContent[] => {
    const zone = diagram.zones.find((declared) => declared.id === id)
    if (zone === undefined) return [text(id)]
    return [text(zone.label)]
  }
  const textVersion: ElementContent[] = []
  const zones = diagram.zones
    .filter((zone) => zone.id !== null)
    .map((zone) => ({
      zone,
      members: diagram.nodes.filter(
        (node) => node.id !== null && node.zone === zone.id
      ),
    }))
    .filter(({ members }) => members.length > 0)
  if (zones.length > 0) {
    textVersion.push(
      element(
        "ul",
        { className: ["doc-diagram-zones"] },
        zones.map(({ zone, members }) =>
          element("li", {}, [
            text(`${zone.label}: `),
            ...joined(
              members.map((node) => name(node.id ?? "")),
              ", "
            ),
          ])
        )
      )
    )
  }
  const connections = diagram.edges.filter(
    (edge) => edge.from !== null && (edge.to !== null || edge.toZone !== null)
  )
  if (connections.length > 0) {
    textVersion.push(
      element(
        "ul",
        { className: ["doc-diagram-connections"] },
        connections.map((edge) =>
          element("li", {}, [
            ...name(edge.from ?? ""),
            text(" → "),
            ...connectionEnd(edge, name, zoneLabel),
            ...labelOf(connectionLabel(edge)),
          ])
        )
      )
    )
  }
  const caption = element("figcaption", {}, [
    element("strong", {}, [text(diagram.title)]),
    text(captionTail(diagram.description)),
  ])
  const properties = { className: ["doc-diagram"], dataDiagram: diagram.id }
  if (diagram.size === null)
    return element("figure", properties, [caption, ...textVersion])
  return element("figure", { ...properties, dataDrawn: "" }, [
    caption,
    element("div", { className: ["doc-diagram-canvas"] }, [
      diagramSvg(diagram, diagram.size, routeOf),
    ]),
    element("div", { className: ["doc-diagram-text"] }, textVersion),
  ])
}

function connectionEnd(
  edge: DiagramEdge,
  name: (id: string) => ElementContent[],
  zoneLabel: (id: string) => ElementContent[]
): ElementContent[] {
  if (edge.to !== null) return name(edge.to)
  return zoneLabel(edge.toZone ?? "")
}

function connectionLabel(edge: DiagramEdge): string | null {
  if (edge.label !== null) return edge.label
  return edge.badge
}

function captionTail(description: string): string {
  if (description === "") return ""
  return `. ${description}`
}

function labelOf(label: string | null): ElementContent[] {
  if (label === null) return []
  return [text(`: ${label}`)]
}

function joined(
  parts: readonly ElementContent[][],
  separator: string
): ElementContent[] {
  const result: ElementContent[] = []
  for (const part of parts) {
    if (result.length > 0) result.push(text(separator))
    result.push(...part)
  }
  return result
}

async function listDir(dir: string): Promise<Dirent[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true })
    return entries.sort((a, b) => a.name.localeCompare(b.name))
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT")
      return []
    throw error
  }
}
