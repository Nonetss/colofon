import { z } from "zod"
import { fit } from "#pages/diagram-measure"
import { salvagedList } from "#pages/diagram-read"
import type { Hue, References } from "#pages/diagram-schema"
import { checkBudget } from "#pages/diagram-types/budget"
import { formSchema, itemList } from "#pages/diagram-types/form"
import { type Item, itemBox, itemFields } from "#pages/diagram-types/items"
import {
  rectShape,
  roleWidth,
  textShape,
} from "#pages/diagram-types/layout/flow-draw"
import {
  type Cell,
  type Grid,
  type Lanes,
  measureGrid,
  type Route,
} from "#pages/diagram-types/layout/grid-route"
import { laneRoute } from "#pages/diagram-types/layout/lane-route"
import { layered } from "#pages/diagram-types/layout/layered"
import { rankNodes } from "#pages/diagram-types/layout/ranks"
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
  type Scene,
  type TextPart,
  type Tools,
  type TypeModule,
} from "#pages/diagram-types/scene"
import {
  accentPaths,
  type DiagramBox,
  type DiagramEdge,
  type DiagramZone,
} from "#pages/diagrams"

// Swimlane (diagram-design's `type-swimlane.md` and, as its `process`
// variant, `type-process.md`): one horizontal band per actor, each step in
// its actor's band, its column its longest distance from the first step
// unless it gives one, and the links between steps at right angles; the
// handoffs cross from band to band. A band is a zone, so hovering its title
// lights its steps. The process variant puts what enters, leaves and is
// used under each step as chips.

const STEP_KINDS = ["step", "decision"] as const

const LIMITS = [
  { max: 5, what: "carriles" },
  { max: 12, what: "pasos" },
  { max: 16, what: "enlaces" },
]

const short = z.array(z.string().min(1))

function laneSchema(references: References) {
  return z.strictObject(itemFields(references))
}

function stepSchema(references: References) {
  return z.strictObject({
    ...itemFields(references),
    lane: z.string().meta({ description: "El id del carril en el que está" }),
    kind: z.enum(STEP_KINDS).optional().meta({
      description: "step (por defecto) o decision: un rombo",
    }),
    col: z.number().int().min(0).optional().meta({
      description: "Su columna (0 la primera); por defecto, la que le toca",
    }),
    inputs: short
      .optional()
      .meta({ description: "Lo que entra (variante process)" }),
    outputs: short
      .optional()
      .meta({ description: "Lo que sale (variante process)" }),
    tools: short
      .optional()
      .meta({ description: "Con qué se hace (variante process)" }),
  })
}

const lanes = laneSchema({})
const steps = stepSchema({})

type StepWritten = z.infer<typeof steps>

function schema(references: References) {
  return formSchema("swimlane", ["process"], {
    lanes: z.array(laneSchema(references)).min(1).meta({
      description: "Los carriles, de arriba abajo, cada uno con id",
    }),
    steps: z.array(stepSchema(references)).min(1).meta({
      description: "Los pasos, cada uno con id y su carril (lane)",
    }),
    links: z.array(linkSchema).optional().meta({
      description: "Las flechas entre pasos: from, to y su etiqueta",
    }),
  })
}

/** What a process step's chips say before their items. */
const CHIPS = [
  ["inputs", "ENTRA"],
  ["outputs", "SALE"],
  ["tools", "CON"],
] as const

const CHIP_ROW = 16
const LEFT = 40
const TOP = 48
const ROW_GAP = 36

type Step = {
  item: Item
  written: StepWritten
  lane: Item
  chips: string[]
}

function read(
  data: Record<string, unknown>,
  tools: Tools,
  variant: string | null
): Scene | null {
  const process = variant === "process"
  const laneItems = itemList(lanes, data.lanes, "lanes", tools, {
    needsId: true,
  })
    .map(({ item }) => item)
    .filter((item) => item.id !== null)
  const read: Step[] = []
  for (const { item, written } of itemList(steps, data.steps, "steps", tools, {
    needsId: true,
    required: ["lane"],
  })) {
    if (item.id === null) continue
    const lane = laneItems.find((candidate) => candidate.id === written.lane)
    if (lane === undefined) {
      tools.report(
        `${item.at}.lane`,
        `\`${written.lane}\` no es ninguno de los carriles`
      )
      continue
    }
    if (!process)
      for (const [key] of CHIPS)
        if (written[key] !== undefined)
          tools.report(
            `${item.at}.${key}`,
            `${key} es de la variante process: añade "variant": "process"`
          )
    read.push({ item, written, lane, chips: chipsOf(written, process) })
  }
  const ids = new Set(read.map((step) => step.item.id ?? ""))
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
    "Un diagrama de carriles",
    LIMITS,
    [laneItems.length, read.length, links.length],
    tools.report
  )

  // Columns: given, or the longest distance from the first step; two
  // steps of one lane never share a column.
  const linkList = links.map(({ written }) => written)
  const firstId = read[0]?.item.id
  const starts = firstId === undefined || firstId === null ? [] : [firstId]
  const ranked = rankNodes([...ids], linkList, starts)
  const taken = new Set<string>()
  const sizes = new Map<
    string,
    { w: number; h: number; boxW: number; boxH: number }
  >()
  const nodes = read.map((step) => {
    const id = step.item.id ?? ""
    const row = laneItems.indexOf(step.lane)
    let col = colOf(step.written.col, ranked.rank.get(id))
    while (taken.has(`${row}:${col}`)) col += 1
    taken.add(`${row}:${col}`)
    const size = sizeOf(step)
    sizes.set(id, size)
    return { id, w: size.w, h: size.boxH, row, col }
  })
  // Every step leaves room for the most chips any step has, so the boxes
  // of a lane share their centre line whatever chips hang under them.
  const chipRoom = Math.max(
    0,
    ...[...sizes.values()].map((size) => size.h - size.boxH)
  )
  for (const node of nodes) node.h += chipRoom
  const rowHeight = Math.max(56, ...nodes.map((node) => node.h)) + 32
  const layout = layered(nodes, linkList, {
    left: LEFT,
    top: TOP,
    rowGap: ROW_GAP,
    colGap: 56,
    rowHeight,
  })

  const scene = emptyScene({ width: 0, height: 0 })
  const boxes = new Map<string, DiagramBox>()
  const boxCells = new Map<string, Cell>()
  const chips: Graphic[] = []
  for (const step of read) {
    const id = step.item.id ?? ""
    const cell = layout.cells.get(id)
    const size = sizes.get(id)
    if (cell === undefined || size === undefined) continue
    const decision = step.written.kind === "decision"
    const shape = decision ? "diamond" : null
    const centre = cell.x + cell.w / 2
    const box = itemBox(step.item, {
      x: centre - size.boxW / 2,
      y: cell.y,
      w: size.boxW,
      h: size.boxH,
      shape,
      zone: step.lane.id,
    })
    box.hue = hueOf(step.item.hue, step.lane.hue)
    boxCells.set(id, { ...cell, x: box.x, w: box.w, h: box.h })
    boxes.set(id, box)
    scene.nodes.push(box)
    step.chips.forEach((chip, index) => {
      const w = roleWidth(chip, "label") + 10
      const y = cell.y + size.boxH + 6 + index * CHIP_ROW
      chips.push(
        rectShape(centre - w / 2, y, w, 12, 2, "fill-soft", "line-rule"),
        textShape(centre, y + 9, chip, "label", "middle", "text-muted")
      )
    })
  }
  scene.over = chips
  // Routes leave and reach the boxes themselves, not the chips under them.
  const grid = measureGrid([...boxCells.values()])
  const used: Lanes = new Map()
  const edges: DiagramEdge[] = []
  let right = layout.right
  links.forEach(({ written }, index) => {
    const route = routeOf(
      laneRouteOf(boxCells, written, grid, used),
      layout.routes[index]
    )
    for (const [x] of route?.points ?? []) right = Math.max(right, x)
    const edge = linkEdge(index, written, route, boxes)
    if (edge !== null) edges.push(edge)
  })
  scene.edges = edges
  const width = Math.ceil(Math.max(right + 48, 360))
  const zones: DiagramZone[] = laneItems.map((lane, row) => ({
    id: lane.id,
    x: 16,
    y: TOP + row * (rowHeight + ROW_GAP) - 20,
    w: width - 32,
    h: rowHeight + 28,
    label: lane.name.toUpperCase(),
    hue: lane.hue,
  }))
  scene.zones = zones
  scene.size = {
    width,
    height: Math.ceil(
      Math.max(
        layout.bottom,
        TOP + laneItems.length * (rowHeight + ROW_GAP) - ROW_GAP
      ) + 24
    ),
  }
  scene.accents =
    read.filter((step) => step.item.focal).length +
    accentPaths(edges.filter((edge) => edge.kind === "accent"))
  scene.legend = legendOf(read, edges, process)
  scene.text = [
    { kind: "list", ordered: false, items: laneLines(laneItems, read) },
    { kind: "list", ordered: false, items: linkList.map(linkLine) },
  ]
  return scene
}

function laneRouteOf(
  cells: ReadonlyMap<string, Cell>,
  link: { from: string; to: string },
  grid: Grid,
  lanes: Lanes
): Route | null {
  const from = cells.get(link.from)
  const to = cells.get(link.to)
  if (from === undefined || to === undefined || from === to) return null
  return laneRoute(grid, from, to, lanes)
}

/** The swimlane's own route, or the grid's when it has none. */
function routeOf(
  own: Route | null,
  fallback: Route | null | undefined
): Route | null {
  if (own !== null) return own
  return fallback ?? null
}

function colOf(given: number | undefined, ranked: number | undefined): number {
  if (given !== undefined) return given
  return ranked ?? 0
}

function hueOf(own: Hue | null, lane: Hue | null): Hue | null {
  if (own !== null) return own
  return lane
}

/** A process step's chips: "ENTRA pedido, pago", one per list it has. */
function chipsOf(written: StepWritten, process: boolean): string[] {
  if (!process) return []
  const chips: string[] = []
  for (const [key, caption] of CHIPS) {
    const list = written[key]
    if (list !== undefined && list.length > 0)
      chips.push(`${caption} ${list.join(", ")}`)
  }
  return chips
}

/** A step's box, and the cell it takes with its chips under it. */
function sizeOf(step: Step): {
  w: number
  h: number
  boxW: number
  boxH: number
} {
  const base = fit(step.item.name, step.item.sub, null, 120)
  const decision = step.written.kind === "decision"
  const boxW = decision ? base + 48 : base
  const plain = decision ? 72 : 52
  const boxH = plain + 12 * step.item.sub.length
  const chipsW = Math.max(
    0,
    ...step.chips.map((chip) => roleWidth(chip, "label") + 10)
  )
  const chipsH = step.chips.length === 0 ? 0 : 6 + step.chips.length * CHIP_ROW
  return { w: Math.max(boxW, chipsW), h: boxH + chipsH, boxW, boxH }
}

/** "<lane>: <step>, <step>", with the steps linked. */
function laneLines(
  lanes: readonly Item[],
  read: readonly Step[]
): TextPart[][] {
  return lanes.map((lane) => {
    const line: TextPart[] = [`${lane.name}: `]
    read
      .filter((step) => step.lane === lane)
      .forEach((step, index) => {
        if (index > 0) line.push(", ")
        line.push({ box: step.item.id ?? "" })
      })
    return line
  })
}

function legendOf(
  read: readonly Step[],
  edges: readonly DiagramEdge[],
  process: boolean
): LegendEntry[] {
  const entries: LegendEntry[] = [
    {
      name: "Paso",
      sample: { kind: "node", node: "service", shape: null },
      series: null,
    },
  ]
  if (read.some((step) => step.written.kind === "decision"))
    entries.push({
      name: "Decisión",
      sample: { kind: "node", node: "service", shape: "diamond" },
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
      name: "Opcional / vuelta",
      sample: { kind: "edge", edge: "dash" },
      series: null,
    })
  if (process && read.some((step) => step.chips.length > 0))
    entries.push({
      name: "Entra / sale / con qué",
      sample: {
        kind: "swatch",
        classes: ["fill-soft", "line-rule"],
        hue: null,
      },
      series: null,
    })
  return entries
}

export const swimlane: TypeModule = {
  name: "swimlane",
  label: "Un diagrama de carriles",
  keys: ["lanes", "steps", "links"],
  variants: ["process"],
  schema,
  read,
}
