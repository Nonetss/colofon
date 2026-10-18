import { z } from "zod"
import { fit } from "#diagrams/measure"
import type {
  DiagramBox,
  DiagramEdge,
  LegendEntry,
  Point,
  TextPart,
} from "#diagrams/model"
import { optional } from "#diagrams/report"
import type { References } from "#diagrams/schema"
import { checkBudget } from "#diagrams/types/kit/budget"
import { formSchema, itemList, oneItem } from "#diagrams/types/kit/form"
import { type Item, itemBox, itemFields } from "#diagrams/types/kit/items"
import {
  emptyScene,
  type Scene,
  type Tools,
  type TypeModule,
} from "#diagrams/types/kit/scene"

// Loop (diagram-design's `type-loop.md`): steps spaced evenly on a ring,
// clockwise from the top, each joined to the next by a curved arrow and the
// last back to the first; an optional hub in the centre gathers the shared
// state, and the steps that write back to it do so along dashed spokes.

const MARGIN = 40
const GAP = 48
/** The arrow leaves this far from a step's edge along the ring. */
const CLEAR = 10

const LIMITS = [{ max: 8, what: "pasos" }]

function schema(references: References) {
  const item = z.strictObject(itemFields(references))
  return formSchema("loop", [], {
    steps: z.array(item).min(3).meta({
      description:
        "Los pasos (3 a 8), en el sentido de las agujas del reloj desde arriba",
    }),
    hub: item.optional().meta({
      description:
        "Lo que hay en el centro: el estado que se acumula en cada vuelta",
    }),
    writes: z.array(z.number().int().min(0)).optional().meta({
      description: "Los pasos (0 el primero) que escriben en el centro",
    }),
  })
}

const items = z.strictObject(itemFields({}))
const indexes = z.array(z.number().int().min(0))

type Station = { item: Item; id: string; centre: Point; angle: number }

/** Where a ray from a box's centre along (ux, uy) leaves the box. */
function boxExit(
  centre: Point,
  w: number,
  h: number,
  ux: number,
  uy: number
): Point {
  const tx = ux === 0 ? Infinity : w / 2 / Math.abs(ux)
  const ty = uy === 0 ? Infinity : h / 2 / Math.abs(uy)
  const t = Math.min(tx, ty)
  return [centre[0] + ux * t, centre[1] + uy * t]
}

/**
 * The id a step's box goes by: its own, or one made from its place, with an
 * underscore no written id can have.
 */
function boxId(item: Item, index: number): string {
  if (item.id !== null) return item.id
  return `_paso-${index + 1}`
}

function read(data: Record<string, unknown>, tools: Tools): Scene {
  const read = itemList(items, data.steps, "steps", tools)
  if (read.length > 0 && read.length < 3)
    tools.report("steps", "Un ciclo tiene al menos 3 pasos")
  checkBudget("Un ciclo", LIMITS, [read.length], tools.report)
  const hub = optionalHub(data.hub, tools)
  const writes = writesOf(data.writes, read.length, hub !== null, tools)

  const count = Math.max(1, read.length)
  const w = Math.max(
    120,
    ...read.map(({ item }) => fit(item.name, item.sub, null, 120))
  )
  const h = Math.max(...read.map(({ item }) => 52 + 12 * item.sub.length), 52)
  const hubW = hubWidth(hub)
  const hubH = hubHeight(hub)
  const radius = ringRadius(
    count,
    { w, h },
    { w: hubW, h: hubH },
    Math.max(150, (w + GAP) / (2 * Math.sin(Math.PI / count)))
  )
  const cx = MARGIN + radius + w / 2
  const cy = MARGIN + radius + h / 2
  const stations: Station[] = read.map(({ item }, index) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / count
    return {
      item,
      id: boxId(item, index),
      centre: [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)],
      angle,
    }
  })

  const scene = emptyScene({
    width: Math.ceil(2 * cx),
    height: Math.ceil(2 * cy),
  })
  const boxes = new Map<string, DiagramBox>()
  for (const station of stations) {
    const box = itemBox(
      { ...station.item, id: station.id },
      {
        x: station.centre[0] - w / 2,
        y: station.centre[1] - h / 2,
        w,
        h,
      }
    )
    boxes.set(station.id, box)
    scene.nodes.push(box)
  }
  const hubId = hubBoxId(hub)
  if (hub !== null)
    scene.nodes.push(
      itemBox(
        { ...hub, id: hubId },
        { x: cx - hubW / 2, y: cy - hubH / 2, w: hubW, h: hubH, kind: "store" }
      )
    )

  const edges: DiagramEdge[] = []
  stations.forEach((station, index) => {
    const next = stations[(index + 1) % stations.length]
    if (next === undefined || next === station) return
    const start = station.angle + clearance(station.angle, w, h, radius)
    const wrap = index + 1 === stations.length ? 2 * Math.PI : 0
    const end = next.angle + wrap - clearance(next.angle, w, h, radius)
    edges.push(
      edgeOf(
        edges.length,
        station.id,
        next.id,
        "default",
        arcPoints(cx, cy, radius, start, end)
      )
    )
  })
  for (const index of writes) {
    const station = stations[index]
    if (station === undefined) continue
    const length = Math.hypot(cx - station.centre[0], cy - station.centre[1])
    const ux = (cx - station.centre[0]) / length
    const uy = (cy - station.centre[1]) / length
    const from = boxExit(station.centre, w + 8, h + 8, ux, uy)
    const to = boxExit([cx, cy], hubW + 8, hubH + 8, -ux, -uy)
    edges.push(edgeOf(edges.length, station.id, hubId, "dash", [from, to]))
  }
  scene.edges = edges

  const hubAccent = hub?.focal === true ? 1 : 0
  scene.accents = read.filter(({ item }) => item.focal).length + hubAccent
  scene.legend = legendOf(writes.length > 0)
  scene.text = textOf(stations, hub, hubId, writes)
  return scene
}

/**
 * The smallest radius from `least` up, on a 4px step, at which every step
 * stays a full gap away from the hub, across or along.
 */
function ringRadius(
  count: number,
  step: { w: number; h: number },
  hub: { w: number; h: number },
  least: number
): number {
  let radius = Math.ceil(least / 4) * 4
  const clears = () => {
    for (let index = 0; index < count; index++) {
      const angle = -Math.PI / 2 + (index * 2 * Math.PI) / count
      const dx = Math.abs(radius * Math.cos(angle))
      const dy = Math.abs(radius * Math.sin(angle))
      const across = dx >= (step.w + hub.w) / 2 + GAP
      const along = dy >= (step.h + hub.h) / 2 + GAP
      if (!across && !along) return false
    }
    return true
  }
  while (hub.w > 0 && !clears()) radius += 4
  return radius
}

function optionalHub(value: unknown, tools: Tools): Item | null {
  if (value === undefined) return null
  const read = oneItem(items, value, "hub", tools)
  if (read === null) return null
  return read.item
}

function hubBoxId(hub: Item | null): string {
  if (hub === null || hub.id === null) return "_centro"
  return hub.id
}

function hubWidth(hub: Item | null): number {
  if (hub === null) return 0
  return fit(hub.name, hub.sub, null, 160)
}

function hubHeight(hub: Item | null): number {
  if (hub === null) return 0
  return 72 + 12 * hub.sub.length
}

/** The valid write-back step indexes; the rest are reported. */
function writesOf(
  value: unknown,
  count: number,
  hasHub: boolean,
  tools: Tools
): number[] {
  const written = optional(indexes, value, "writes", tools.report)
  if (written === undefined) return []
  if (!hasHub) {
    tools.report("writes", "Sin hub no hay centro en el que escribir")
    return []
  }
  const kept: number[] = []
  written.forEach((index, at) => {
    if (index < count) kept.push(index)
    else
      tools.report(
        `writes.${at}`,
        `No hay ningún paso ${index}: van del 0 al ${count - 1}`
      )
  })
  return kept
}

/**
 * The angle a step takes up on each side along the ring, plus a margin: its
 * half-width where the ring runs across it, its half-height where it runs
 * down it.
 */
function clearance(
  angle: number,
  w: number,
  h: number,
  radius: number
): number {
  const along =
    Math.abs(Math.sin(angle)) * (w / 2) + Math.abs(Math.cos(angle)) * (h / 2)
  return (along + CLEAR) / radius
}

/** Five points on the ring from `start` to `end`, for a smooth arc. */
function arcPoints(
  cx: number,
  cy: number,
  radius: number,
  start: number,
  end: number
): Point[] {
  const points: Point[] = []
  for (let step = 0; step <= 4; step++) {
    const angle = start + ((end - start) * step) / 4
    points.push([cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)])
  }
  return points
}

function edgeOf(
  index: number,
  from: string,
  to: string,
  kind: DiagramEdge["kind"],
  points: Point[]
): DiagramEdge {
  return {
    index,
    points,
    from,
    to,
    toZone: null,
    kind,
    label: null,
    at: null,
    anchor: "middle",
    hue: null,
    info: null,
    noHead: false,
    head: "arrow",
    route: "curve",
    badge: null,
  }
}

function legendOf(writes: boolean): LegendEntry[] {
  if (!writes) return []
  return [
    {
      name: "Siguiente paso",
      sample: { kind: "edge", edge: "default" },
      series: null,
    },
    {
      name: "Escribe en el centro",
      sample: { kind: "edge", edge: "dash" },
      series: null,
    },
  ]
}

function textOf(
  stations: readonly Station[],
  hub: Item | null,
  hubId: string,
  writes: readonly number[]
): Scene["text"] {
  const first = stations[0]
  const cycle: TextPart[] = []
  for (const station of stations) {
    if (cycle.length > 0) cycle.push(" → ")
    cycle.push({ box: station.id })
  }
  if (first !== undefined) cycle.push(" → ", { box: first.id })
  const lines: TextPart[][] = [cycle]
  if (hub !== null) lines.push(["Centro: ", { box: hubId }])
  if (writes.length > 0) {
    const writers: TextPart[] = ["Escriben en ", { box: hubId }, ": "]
    writes.forEach((index, at) => {
      const station = stations[index]
      if (station === undefined) return
      if (at > 0) writers.push(", ")
      writers.push({ box: station.id })
    })
    lines.push(writers)
  }
  return [{ kind: "list", ordered: false, items: lines }]
}

export const loop: TypeModule = {
  name: "loop",
  label: "Un ciclo",
  keys: ["steps", "hub", "writes"],
  variants: [],
  schema,
  read: (data, tools) => read(data, tools),
}
