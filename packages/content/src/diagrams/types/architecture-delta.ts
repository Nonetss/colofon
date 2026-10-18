import { z } from "zod"
import { isRecord } from "#contract/read/records"
import { drawnDiagram } from "#diagrams/drawn"
import { textWidth } from "#diagrams/measure"
import type {
  Diagram,
  DiagramBox,
  DiagramEdge,
  Graphic,
  LegendEntry,
  Point,
  TextPart,
} from "#diagrams/model"
import { type Report, salvagedList, unknownKeys } from "#diagrams/report"
import { diagramSchemas, type References } from "#diagrams/schema"
import { checkBudget } from "#diagrams/types/kit/budget"
import { formSchema } from "#diagrams/types/kit/form"
import {
  emptyScene,
  paint,
  type Scene,
  type Tools,
  type TypeModule,
} from "#diagrams/types/kit/scene"

// Architecture delta (diagram-design's `type-architecture-delta.md`): two
// snapshots of one system, "Antes" and "Después", each a drawn diagram read
// by the drawn form itself, side by side with a "Cambios" ledger between
// them. The platform compares the snapshots by box id and by connection:
// what was added, removed, changed (its name, lines, kind, tag, shape or
// hue), moved (its zone) or rewired. Removed boxes are dashed in "Antes";
// each changed piece carries a chip with its mark. A box keeps its id in
// both snapshots, so hovering it lights it in both.

/** The keys of each snapshot: a drawn diagram's drawing. */
const SNAPSHOT_KEYS = ["width", "height", "nodes", "edges", "zones", "notes"]

const LIMITS = [
  { max: 8, what: "piezas" },
  { max: 10, what: "conexiones" },
  { max: 8, what: "cambios" },
]

/** Where the panels start, and the ledger's width. */
const PAD = 24
const TOP = 48
const LEDGER = 248

type Mark = "added" | "removed" | "changed" | "moved" | "rewired"

/** The ledger's word for each change, and the chip a piece carries. */
const WORDS: Record<Mark, string> = {
  added: "AÑADIDO",
  removed: "QUITADO",
  changed: "CAMBIADO",
  moved: "MOVIDO",
  rewired: "RECONECTADO",
}

const CHIPS: Record<Mark, string> = {
  added: "+",
  removed: "−",
  changed: "Δ",
  moved: "↦",
  rewired: "⇄",
}

/** One ledger entry: what changed, on which piece, and how. */
type Entry = {
  mark: Mark
  /** The piece, or the connection's ends, as text-version parts. */
  subject: TextPart[]
  /** The subject as plain text, for the drawing. */
  label: string
  detail: string | null
  note: string | null
}

const changeSchema = z.strictObject({
  id: z.string().meta({ description: "El id de la caja que cambia" }),
  note: z.string().min(1).meta({ description: "Por qué cambia, en una frase" }),
})

function snapshotSchema(references: References) {
  const drawn = diagramSchemas(references)
  return z.strictObject({
    width: z.number().positive().meta({ description: "El ancho del dibujo" }),
    height: z.number().positive().meta({ description: "El alto del dibujo" }),
    nodes: z.array(drawn.box).min(1),
    edges: z.array(drawn.edge).optional(),
    zones: z.array(drawn.zone).optional(),
    notes: z.array(drawn.note).optional(),
  })
}

function schema(references: References) {
  return formSchema("architecture-delta", [], {
    before: snapshotSchema(references).meta({
      description:
        "El sistema antes: un diagrama dibujado (width, height, nodes, edges, zones, notes)",
    }),
    after: snapshotSchema(references).meta({
      description:
        "El sistema después, con los mismos ids para las piezas que siguen",
    }),
    changes: z.array(changeSchema).optional().meta({
      description: "Por qué cambia cada pieza: su id y una nota",
    }),
  })
}

/**
 * One snapshot read by the drawn form, its problems reported under `key`
 * (`before.nodes.0.entity: …`); `null` when nothing can be drawn.
 */
function snapshotOf(
  value: unknown,
  key: "before" | "after",
  tools: Tools
): Snapshot | null {
  if (value === undefined) {
    tools.report(key, "Falta: es obligatorio")
    return null
  }
  if (!isRecord(value)) {
    tools.report(key, "Es un diagrama dibujado: width, height, nodes…")
    return null
  }
  const report: Report = (at, message) => tools.report(`${key}.${at}`, message)
  unknownKeys(value, SNAPSHOT_KEYS, key, (_, message) =>
    tools.report(key, message)
  )
  const drawing: Record<string, unknown> = { title: key, desc: key }
  for (const name of SNAPSHOT_KEYS)
    if (value[name] !== undefined) drawing[name] = value[name]
  const diagram = drawnDiagram(key, drawing, tools.context, report)
  const { size } = diagram
  if (size === null) return null
  return { ...diagram, size }
}

/** A snapshot read as a drawn diagram, with its size. */
type Snapshot = Diagram & { size: { width: number; height: number } }

function read(data: Record<string, unknown>, tools: Tools): Scene | null {
  const before = snapshotOf(data.before, "before", tools)
  const after = snapshotOf(data.after, "after", tools)
  if (before === null || after === null) return null
  for (const entity of [...before.entities, ...after.entities])
    if (!tools.entities.includes(entity)) tools.entities.push(entity)

  const notes = notesOf(data.changes, before, after, tools)
  const delta = compare(before, after, notes)
  checkBudget(
    "Un diagrama de antes y después",
    LIMITS,
    [delta.pieces, delta.connections, delta.entries.length],
    tools.report
  )

  const afterX = PAD + before.size.width + PAD + LEDGER + PAD
  const scene = emptyScene({ width: 0, height: 0 })
  const beforeNodes = before.nodes.map((box) =>
    moved(box, PAD, TOP, delta.removedBoxes.has(idOf(box)))
  )
  const afterNodes = after.nodes.map((box) => moved(box, afterX, TOP, false))
  scene.nodes = [...beforeNodes, ...afterNodes]
  scene.edges = [
    ...before.edges.map((edge, index) =>
      movedEdge(edge, index, PAD, TOP, delta.removedEdges.has(index))
    ),
    ...after.edges.map((edge, index) =>
      movedEdge(
        edge,
        before.edges.length + index,
        afterX,
        TOP,
        delta.rewiredEdges.has(index)
      )
    ),
  ]
  scene.zones = [
    ...before.zones.map((zone) => ({
      ...zone,
      x: zone.x + PAD,
      y: zone.y + TOP,
    })),
    ...after.zones.map((zone) => ({
      ...zone,
      x: zone.x + afterX,
      y: zone.y + TOP,
    })),
  ]
  scene.notes = [
    ...before.notes.map((note) => ({
      ...note,
      x: note.x + PAD,
      y: note.y + TOP,
    })),
    ...after.notes.map((note) => ({
      ...note,
      x: note.x + afterX,
      y: note.y + TOP,
    })),
  ]
  const ledgerX = PAD + before.size.width + PAD
  const ledger = ledgerGraphics(delta.entries, ledgerX, TOP)
  const height = Math.max(
    TOP + before.size.height,
    TOP + after.size.height,
    ledger.bottom + PAD
  )
  scene.under = [
    heading("ANTES", PAD, 24),
    heading("CAMBIOS", ledgerX, 24),
    heading("DESPUÉS", afterX, 24),
    separator(ledgerX - PAD / 2, height),
    separator(afterX - PAD / 2, height),
  ]
  scene.over = [
    ...chips(beforeNodes, delta.beforeMarks),
    ...chips(afterNodes, delta.afterMarks),
    ...ledger.graphics,
  ]
  scene.size = { width: afterX + after.size.width + PAD, height }
  scene.legend = legendOf(delta)
  scene.text = textOf(delta)
  return scene
}

/** A hairline between two panels, down the whole drawing. */
function separator(x: number, height: number): Graphic {
  return {
    kind: "line",
    x1: x,
    y1: TOP - 8,
    x2: x,
    y2: height - 8,
    ...paint("line-rule"),
  }
}

function heading(text: string, x: number, y: number): Graphic {
  return {
    kind: "text",
    x,
    y,
    text,
    role: "legend",
    anchor: "start",
    mask: false,
    ...paint("text-muted"),
  }
}

function idOf(box: DiagramBox): string {
  return box.id ?? ""
}

/** The `changes` notes by box id, an id that is no box reported. */
function notesOf(
  value: unknown,
  before: Diagram,
  after: Diagram,
  tools: Tools
): Map<string, string> {
  const ids = new Set<string>()
  for (const box of [...before.nodes, ...after.nodes])
    if (box.id !== null) ids.add(box.id)
  const notes = new Map<string, string>()
  for (const { at, value: change } of salvagedList(
    changeSchema,
    value,
    "changes",
    ["id", "note"],
    tools.report,
    false
  )) {
    if (!ids.has(change.id)) {
      tools.report(
        `${at}.id`,
        `\`${change.id}\` no es ninguna caja de before ni de after`
      )
      continue
    }
    notes.set(change.id, change.note)
  }
  return notes
}

// ── Comparing ─────────────────────────────────────────────────────────────

type Delta = {
  entries: Entry[]
  /** The ids of the boxes in both snapshots that did not change. */
  unchanged: string[]
  removedBoxes: Set<string>
  /** The indexes of the before edges removed, and the after edges rewired. */
  removedEdges: Set<number>
  rewiredEdges: Set<number>
  /** The marks each box carries, by id, in each snapshot. */
  beforeMarks: Map<string, Mark[]>
  afterMarks: Map<string, Mark[]>
  /** How many distinct pieces and connections the two snapshots hold. */
  pieces: number
  connections: number
  rewired: boolean
}

/** A connection: an arrow or badge with both ends, by its index. */
type Connection = { index: number; from: string; to: string }

function connectionsOf(diagram: Diagram): Connection[] {
  const found: Connection[] = []
  diagram.edges.forEach((edge, index) => {
    if (edge.from !== null && edge.to !== null)
      found.push({ index, from: edge.from, to: edge.to })
  })
  return found
}

function compare(
  before: Diagram,
  after: Diagram,
  notes: ReadonlyMap<string, string>
): Delta {
  const was = new Map<string, DiagramBox>()
  for (const box of before.nodes) if (box.id !== null) was.set(box.id, box)
  const now = new Map<string, DiagramBox>()
  for (const box of after.nodes) if (box.id !== null) now.set(box.id, box)
  const entries: Entry[] = []
  const unchanged: string[] = []
  const beforeMarks = new Map<string, Mark[]>()
  const afterMarks = new Map<string, Mark[]>()
  const mark = (marks: Map<string, Mark[]>, id: string, kind: Mark) => {
    const list = marks.get(id)
    if (list === undefined) marks.set(id, [kind])
    else list.push(kind)
  }
  const pieceEntry = (
    kind: Mark,
    box: DiagramBox,
    detail: string | null
  ): Entry => ({
    mark: kind,
    subject: [{ box: idOf(box) }],
    label: box.name,
    detail,
    note: notes.get(idOf(box)) ?? null,
  })

  for (const [id, box] of was) {
    if (now.has(id)) continue
    entries.push(pieceEntry("removed", box, null))
    mark(beforeMarks, id, "removed")
  }
  for (const [id, box] of now) {
    const old = was.get(id)
    if (old === undefined) {
      entries.push(pieceEntry("added", box, null))
      mark(afterMarks, id, "added")
      continue
    }
    const differences = differencesOf(old, box)
    const zone = zoneChange(old, box, before, after)
    if (differences.length > 0) {
      entries.push(pieceEntry("changed", box, differences.join("; ")))
      mark(afterMarks, id, "changed")
    }
    if (zone !== null) {
      entries.push(pieceEntry("moved", box, zone))
      mark(afterMarks, id, "moved")
    }
    if (differences.length === 0 && zone === null) unchanged.push(id)
  }

  const oldLinks = connectionsOf(before)
  const newLinks = connectionsOf(after)
  const same = (a: Connection, b: Connection) =>
    a.from === b.from && a.to === b.to
  const gone = oldLinks.filter((a) => !newLinks.some((b) => same(a, b)))
  const fresh = newLinks.filter((b) => !oldLinks.some((a) => same(a, b)))
  const removedEdges = new Set<number>()
  const rewiredEdges = new Set<number>()
  // A connection that keeps one end and moves the other to a piece that
  // was already there is rewired; one to or from a new or removed piece is
  // removed and added instead.
  const kept = (id: string) => was.has(id) && now.has(id)
  for (const old of [...gone]) {
    const partner = fresh.find(
      (candidate) =>
        kept(old.from) &&
        kept(old.to) &&
        kept(candidate.from) &&
        kept(candidate.to) &&
        (candidate.from === old.from || candidate.to === old.to)
    )
    if (partner === undefined) continue
    gone.splice(gone.indexOf(old), 1)
    fresh.splice(fresh.indexOf(partner), 1)
    removedEdges.add(old.index)
    rewiredEdges.add(partner.index)
    entries.push({
      mark: "rewired",
      subject: linkParts(partner),
      label: `${nameIn(after, partner.from)} → ${nameIn(after, partner.to)}`,
      detail: `antes ${nameIn(before, old.from)} → ${nameIn(before, old.to)}`,
      note: null,
    })
  }
  for (const old of gone) {
    removedEdges.add(old.index)
    entries.push({
      mark: "removed",
      subject: linkParts(old),
      label: `${nameIn(before, old.from)} → ${nameIn(before, old.to)}`,
      detail: null,
      note: null,
    })
  }
  for (const link of fresh)
    entries.push({
      mark: "added",
      subject: linkParts(link),
      label: `${nameIn(after, link.from)} → ${nameIn(after, link.to)}`,
      detail: null,
      note: null,
    })

  const pieces = new Set([...was.keys(), ...now.keys()]).size
  const pairs = new Set(
    [...oldLinks, ...newLinks].map((link) => `${link.from}>${link.to}`)
  )
  return {
    entries,
    unchanged,
    removedBoxes: new Set(
      entries
        .filter(
          (entry) => entry.mark === "removed" && entry.subject.length === 1
        )
        .map((entry) => boxIdOf(entry))
    ),
    removedEdges,
    rewiredEdges,
    beforeMarks,
    afterMarks,
    pieces,
    connections: pairs.size,
    rewired: rewiredEdges.size > 0,
  }
}

function boxIdOf(entry: Entry): string {
  const [part] = entry.subject
  if (part === undefined || typeof part === "string") return ""
  return part.box
}

function linkParts(link: Connection): TextPart[] {
  return [{ box: link.from }, " → ", { box: link.to }]
}

function nameIn(diagram: Diagram, id: string): string {
  const box = diagram.nodes.find((node) => node.id === id)
  if (box === undefined) return id
  return box.name
}

/** What differs between a retained box's two versions, "nombre: A → B". */
function differencesOf(old: DiagramBox, box: DiagramBox): string[] {
  const found: string[] = []
  const compareText = (what: string, a: string | null, b: string | null) => {
    if (a !== b) found.push(`${what}: ${a ?? "—"} → ${b ?? "—"}`)
  }
  compareText("nombre", old.name, box.name)
  compareText("líneas", old.sub.join(" / "), box.sub.join(" / "))
  compareText("tipo", old.kind, box.kind)
  compareText("etiqueta", old.tag, box.tag)
  compareText("forma", old.shape, box.shape)
  compareText("color", old.hue, box.hue)
  return found
}

/** "zona: Casa → Nube" when a retained box changes zone, else `null`. */
function zoneChange(
  old: DiagramBox,
  box: DiagramBox,
  before: Diagram,
  after: Diagram
): string | null {
  if (old.zone === box.zone) return null
  return `zona: ${zoneName(before, old.zone)} → ${zoneName(after, box.zone)}`
}

function zoneName(diagram: Diagram, id: string | null): string {
  if (id === null) return "ninguna"
  const zone = diagram.zones.find((candidate) => candidate.id === id)
  if (zone === undefined) return id
  return zone.label
}

// ── Drawing ───────────────────────────────────────────────────────────────

/** A box moved by (dx, dy); a removed one drawn dashed, as not in use. */
function moved(
  box: DiagramBox,
  dx: number,
  dy: number,
  removed: boolean
): DiagramBox {
  const kind = removed ? "optional" : box.kind
  return { ...box, x: box.x + dx, y: box.y + dy, kind }
}

/** An arrow moved by (dx, dy), renumbered; a removed or rewired one dashed. */
function movedEdge(
  edge: DiagramEdge,
  index: number,
  dx: number,
  dy: number,
  dashed: boolean
): DiagramEdge {
  const kind = dashed ? "dash" : edge.kind
  return {
    ...edge,
    index,
    kind,
    points: shiftedPoints(edge.points, dx, dy),
    at: shiftedPoint(edge.at, dx, dy),
  }
}

function shiftedPoints(
  points: readonly Point[] | null,
  dx: number,
  dy: number
): Point[] | null {
  if (points === null) return null
  return points.map((point) => shift(point, dx, dy))
}

function shiftedPoint(
  point: Point | null,
  dx: number,
  dy: number
): Point | null {
  if (point === null) return null
  return shift(point, dx, dy)
}

function shift(point: Point, dx: number, dy: number): Point {
  return [point[0] + dx, point[1] + dy]
}

/** The chips of the marks each box carries, on its top right corner. */
function chips(
  boxes: readonly DiagramBox[],
  marks: ReadonlyMap<string, Mark[]>
): Graphic[] {
  const graphics: Graphic[] = []
  for (const box of boxes) {
    const kinds = marks.get(idOf(box))
    if (kinds === undefined || box.id === null) continue
    kinds.forEach((kind, index) => {
      const cx = box.x + box.w - 2 - 18 * index
      const cy = box.y + 2
      graphics.push(
        { kind: "circle", cx, cy, r: 8, ...paint("fill-paper", "line-ink") },
        {
          kind: "text",
          x: cx,
          y: cy + 3,
          text: CHIPS[kind],
          role: "value",
          anchor: "middle",
          mask: false,
          ...paint("text-ink", "text-bold"),
        }
      )
    })
  }
  return graphics
}

/** The ledger, one entry under the other, its lines wrapped to its width. */
function ledgerGraphics(
  entries: readonly Entry[],
  x: number,
  top: number
): { graphics: Graphic[]; bottom: number } {
  const graphics: Graphic[] = []
  let y = top + 10
  if (entries.length === 0) {
    graphics.push(textLine("Sin cambios", x, y, "sub", "text-muted"))
    return { graphics, bottom: y }
  }
  for (const entry of entries) {
    graphics.push(
      textLine(
        `${CHIPS[entry.mark]} ${WORDS[entry.mark]}`,
        x,
        y,
        "label",
        "text-ink"
      )
    )
    y += 15
    for (const line of wrap(entry.label, "name")) {
      graphics.push(textLine(line, x, y, "item", "text-ink"))
      y += 14
    }
    for (const text of [entry.detail, entry.note]) {
      if (text === null) continue
      for (const line of wrap(text, "sub")) {
        graphics.push(textLine(line, x, y, "sub", "text-muted"))
        y += 13
      }
    }
    y += 12
  }
  return { graphics, bottom: y }
}

function textLine(
  text: string,
  x: number,
  y: number,
  role: "label" | "item" | "sub",
  colour: string
): Graphic {
  return {
    kind: "text",
    x,
    y,
    text,
    role,
    anchor: "start",
    mask: false,
    ...paint(colour),
  }
}

/** `text` broken into lines that fit the ledger, word by word. */
function wrap(text: string, face: "name" | "sub"): string[] {
  const width = (line: string) => {
    if (face === "name") return textWidth(line, 11, "sans")
    return textWidth(line, 9, "mono")
  }
  const lines: string[] = []
  let line = ""
  for (const word of text.split(/\s+/)) {
    const next = line === "" ? word : `${line} ${word}`
    if (line !== "" && width(next) > LEDGER - 8) {
      lines.push(line)
      line = word
    } else line = next
  }
  if (line !== "") lines.push(line)
  return lines
}

function legendOf(delta: Delta): LegendEntry[] {
  const entries: LegendEntry[] = [
    {
      name: "Pieza",
      sample: { kind: "node", node: "service", shape: null },
      series: null,
    },
  ]
  if (delta.removedBoxes.size > 0)
    entries.push({
      name: "Quitada",
      sample: { kind: "node", node: "optional", shape: null },
      series: null,
    })
  entries.push({
    name: "Conexión",
    sample: { kind: "edge", edge: "default" },
    series: null,
  })
  if (delta.removedEdges.size > 0 || delta.rewired)
    entries.push({
      name: "Conexión quitada o reconectada",
      sample: { kind: "edge", edge: "dash" },
      series: null,
    })
  return entries
}

/** The ledger as text, then the pieces that stay as they were. */
function textOf(delta: Delta): Scene["text"] {
  const items: TextPart[][] = delta.entries.map((entry) => {
    const line: TextPart[] = [`${WORDS[entry.mark]}: `, ...entry.subject]
    if (entry.detail !== null) line.push(` (${entry.detail})`)
    if (entry.note !== null) line.push(`. ${entry.note}`)
    return line
  })
  if (delta.unchanged.length > 0) {
    const line: TextPart[] = ["SIN CAMBIOS: "]
    delta.unchanged.forEach((id, index) => {
      if (index > 0) line.push(", ")
      line.push({ box: id })
    })
    items.push(line)
  }
  return [{ kind: "list", ordered: false, items }]
}

export const architectureDelta: TypeModule = {
  name: "architecture-delta",
  label: "Un diagrama de antes y después",
  keys: ["before", "after", "changes"],
  variants: [],
  schema,
  read: (data, tools) => read(data, tools),
}
