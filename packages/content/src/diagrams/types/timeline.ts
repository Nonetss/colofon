import { z } from "zod"
import type { Graphic, LegendEntry } from "#diagrams/model"
import { salvagedList } from "#diagrams/report"
import { HUES, type Hue, type References } from "#diagrams/schema"
import { checkBudget } from "#diagrams/types/kit/budget"
import {
  lineShape,
  rectShape,
  roleWidth,
  shape,
  textShape,
} from "#diagrams/types/kit/flow"
import { formSchema, itemList } from "#diagrams/types/kit/form"
import { type Item, itemFields } from "#diagrams/types/kit/items"
import { withDatum, withLink } from "#diagrams/types/kit/marks"
import {
  emptyScene,
  type Scene,
  type Tools,
  type TypeModule,
} from "#diagrams/types/kit/scene"
import {
  type DayOrMonth,
  dateSchema,
  dayTick,
  formatDate,
  monthTick,
  parseDate,
} from "#diagrams/types/kit/values"
import { type Box, overlaps } from "#diagrams/types/layout/labels"
import { exactScale, timeTicks } from "#diagrams/types/layout/scale"

// Timeline (diagram-design's `type-timeline.md`): events as dots on one
// horizontal axis, placed by their dates (honestly: unequal gaps stay
// unequal) or evenly with `scale: "even"`; their labels alternate above and
// below, climbing to an outer tier where they would collide, and a focal
// event is in the accent. Spans are bands under the axis.

const LIMITS = [
  { max: 12, what: "eventos" },
  { max: 4, what: "periodos" },
]

const text = z.string().min(1)

function eventSchema(references: References) {
  return z.strictObject({
    ...itemFields(references),
    date: dateSchema,
  })
}

const spanSchema = z.strictObject({
  name: text.meta({ description: "Su nombre" }),
  start: dateSchema,
  end: dateSchema,
  hue: z.enum(HUES).optional().meta({ description: "Su color" }),
})

const events = eventSchema({})

function schema(references: References) {
  return formSchema("timeline", [], {
    events: z.array(eventSchema(references)).min(1).meta({
      description: "Los eventos, cada uno con su fecha",
    }),
    spans: z.array(spanSchema).optional().meta({
      description: "Periodos, como bandas bajo el eje",
    }),
    scale: z.enum(["time", "even"]).optional().meta({
      description:
        "time (por defecto): cada evento en su fecha; even: a la misma distancia, en orden",
    }),
  })
}

const LEFT = 48
/** The tiers a label can take on each side, and how far apart they are. */
const TIERS = 3
const TIER = 30
const SPAN_ROW = 20

type Placed = { item: Item; date: DayOrMonth; x: number }

/** Where an event's label went: above or below, and in which tier. */
type LabelSpot = { above: boolean; tier: number }

function read(data: Record<string, unknown>, tools: Tools): Scene | null {
  const read = itemList(events, data.events, "events", tools, {
    required: ["date"],
  })
  const spans: { name: string; start: number; end: number; hue: Hue | null }[] =
    []
  for (const { at, value } of salvagedList(
    spanSchema,
    data.spans,
    "spans",
    ["name", "start", "end"],
    tools.report,
    false
  )) {
    const start = parseDate(value.start)
    const end = parseDate(value.end)
    if (start === null || end === null) continue
    if (end.time < start.time) {
      tools.report(`${at}.end`, "Un periodo termina después de empezar")
      continue
    }
    spans.push({
      name: value.name,
      start: start.time,
      end: end.time,
      hue: value.hue ?? null,
    })
  }
  checkBudget(
    "Una línea de tiempo",
    LIMITS,
    [read.length, spans.length],
    tools.report
  )

  const dated: { item: Item; date: DayOrMonth }[] = []
  for (const { item, written } of read) {
    const date = parseDate(written.date)
    if (date !== null) dated.push({ item, date })
  }
  dated.sort((a, b) => a.date.time - b.date.time)
  const even = data.scale === "even"
  const width = Math.max(720, 96 * dated.length + 2 * LEFT)
  const axisLeft = LEFT
  const axisRight = width - LEFT
  const times = [
    ...dated.map(({ date }) => date.time),
    ...spans.flatMap((span) => [span.start, span.end]),
  ]
  const min = Math.min(...times)
  const max = Math.max(...times)
  const at = exactScale(min, max, axisLeft + 16, axisRight - 16)
  const step = (axisRight - axisLeft - 32) / Math.max(1, dated.length - 1)
  const placed: Placed[] = dated.map(({ item, date }, position) => {
    if (even) {
      if (dated.length === 1)
        return { item, date, x: (axisLeft + axisRight) / 2 }
      return { item, date, x: axisLeft + 16 + step * position }
    }
    return { item, date, x: at(date.time) }
  })

  // Labels, alternating sides, each in the first tier where it fits.
  const taken: Box[] = []
  const spots: (LabelSpot | null)[] = placed.map((event, position) => {
    const sides = position % 2 === 0 ? [true, false] : [false, true]
    for (let tier = 0; tier < TIERS; tier++) {
      for (const above of sides) {
        const box = labelBox(event, { above, tier }, width)
        if (taken.some((other) => overlaps(box, other))) continue
        taken.push(box)
        return { above, tier }
      }
    }
    tools.report(
      event.item.at,
      `La etiqueta de "${event.item.name}" no cabe sin pisar otra: separa los eventos o quita alguno`
    )
    return null
  })
  const tiersAbove = Math.max(
    0,
    ...spots
      .filter((spot) => spot?.above === true)
      .map((spot) => (spot?.tier ?? 0) + 1)
  )
  const tiersBelow = Math.max(
    0,
    ...spots
      .filter((spot) => spot?.above === false)
      .map((spot) => (spot?.tier ?? 0) + 1)
  )
  const spanRows = rowsOfSpans(spans)
  const spanCount = spanRowCount(spanRows)
  const axis = 24 + tiersAbove * TIER + 16
  const belowStart = axis + 26 + spanCount * SPAN_ROW

  const scene = emptyScene({ width, height: 0 })
  const under: Graphic[] = [
    lineShape(axisLeft, axis, axisRight, axis, "line-ink"),
  ]
  if (!even) under.push(...ticksOf(min, max, at, axis, axisLeft, axisRight))
  spans.forEach((span, position) => {
    const y = axis + 22 + (spanRows[position] ?? 0) * SPAN_ROW
    const x1 = at(span.start)
    const x2 = Math.max(at(span.end), x1 + 4)
    under.push(spanBand(x1, y, x2 - x1, span.hue))
    under.push(
      textShape(x1 + 4, y + 10, span.name, "label", "start", "text-ink")
    )
  })
  const over: Graphic[] = []
  placed.forEach((event, position) => {
    const spot = spots[position] ?? null
    const focal = event.item.focal
    const radius = focal ? 6 : 4
    const fill = focal ? "fill-accent" : "fill-ink"
    const dot = shape(
      { kind: "circle", cx: event.x, cy: axis, r: radius },
      fill
    )
    over.push(
      withDatum(dot, {
        id: `m${position}`,
        label: event.item.name,
        series: null,
        value: formatDate(event.date),
        info: event.item.info,
      })
    )
    if (spot === null) return
    const nameY = labelBaseline(spot, axis, belowStart)
    const lineEnd = spot.above ? nameY + 16 : nameY - 12
    under.push(lineShape(event.x, axis, event.x, lineEnd, "line-rule"))
    const nameClasses = focal ? ["text-accent", "text-bold"] : ["text-ink"]
    over.push(
      withLink(
        textShape(
          event.x,
          nameY,
          event.item.name,
          "item",
          "middle",
          ...nameClasses
        ),
        event.item.link
      ),
      textShape(event.x, nameY + 12, formatDate(event.date), "tick", "middle")
    )
  })
  scene.under = under
  scene.over = over
  scene.size = {
    width,
    height: Math.ceil(belowStart + tiersBelow * TIER + 24),
  }
  scene.accents = placed.filter(({ item }) => item.focal).length
  scene.legend = legendOf(placed, spans.length > 0)
  scene.text = [
    {
      kind: "list",
      ordered: false,
      items: placed.map(({ item, date }) => [
        `${formatDate(date)}: `,
        item.name,
      ]),
    },
  ]
  return scene
}

/** A label's baseline (its name's; its date goes 12px lower). */
function labelBaseline(
  spot: LabelSpot,
  axis: number,
  belowStart: number
): number {
  if (spot.above) return axis - 32 - spot.tier * TIER
  return belowStart + 12 + spot.tier * TIER
}

/** The box a label takes, with the axis at 0 and the spans' room ignored. */
function labelBox(event: Placed, spot: LabelSpot, width: number): Box {
  const w =
    Math.max(
      roleWidth(event.item.name, "item"),
      roleWidth(formatDate(event.date), "tick")
    ) + 12
  const left = Math.min(Math.max(4, event.x - w / 2), width - 4 - w)
  const top = spot.above ? -44 - spot.tier * TIER : 20 + spot.tier * TIER
  return { x: left, y: top, w, h: TIER - 4 }
}

/** A span's band, tinted by its hue, or in the neutral soft fill. */
function spanBand(x: number, y: number, w: number, hue: Hue | null): Graphic {
  if (hue === null) return rectShape(x, y, w, 14, 2, "fill-soft", "line-soft")
  return { ...rectShape(x, y, w, 14, 2, "fill-hue-tint", "line-hue"), hue }
}

/** How many rows the spans take. */
function spanRowCount(rows: readonly number[]): number {
  if (rows.length === 0) return 0
  return Math.max(...rows) + 1
}

/** The row of each span: the first where it overlaps no other span. */
function rowsOfSpans(
  spans: readonly { start: number; end: number }[]
): number[] {
  const rows: { start: number; end: number }[][] = []
  return spans.map((span) => {
    let row = rows.findIndex((taken) =>
      taken.every((other) => span.end < other.start || other.end < span.start)
    )
    if (row === -1) {
      row = rows.length
      rows.push([])
    }
    rows[row]?.push(span)
    return row
  })
}

/** Ticks under the axis: weeks or months, thinned to twelve at most. */
function ticksOf(
  min: number,
  max: number,
  at: (time: number) => number,
  axis: number,
  left: number,
  right: number
): Graphic[] {
  const { unit, ticks } = timeTicks(min, max)
  const every = Math.max(1, Math.ceil(ticks.length / 12))
  const shapes: Graphic[] = []
  ticks.forEach((tick, position) => {
    if (position % every !== 0) return
    const x = at(tick)
    if (x < left || x > right) return
    const label =
      unit === "week" ? dayTick(tick) : monthTick(tick, position === 0)
    shapes.push(
      lineShape(x, axis - 3, x, axis + 3, "line-ink"),
      textShape(x, axis + 14, label, "tick", "middle")
    )
  })
  return shapes
}

function legendOf(placed: readonly Placed[], spans: boolean): LegendEntry[] {
  const entries: LegendEntry[] = []
  if (placed.some(({ item }) => item.focal))
    entries.push({
      name: "Hito principal",
      sample: { kind: "dot", classes: ["fill-accent"], hue: null },
      series: null,
    })
  if (entries.length === 0 && !spans) return []
  entries.unshift({
    name: "Evento",
    sample: { kind: "dot", classes: ["fill-ink"], hue: null },
    series: null,
  })
  return entries
}

export const timeline: TypeModule = {
  name: "timeline",
  label: "Una línea de tiempo",
  keys: ["events", "spans", "scale"],
  variants: [],
  schema,
  read: (data, tools) => read(data, tools),
}
