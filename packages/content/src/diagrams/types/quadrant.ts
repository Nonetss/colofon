import { z } from "zod"
import { textWidth } from "#diagrams/measure"
import { TEXT_ROLES } from "#diagrams/model"
import type { References } from "#diagrams/schema"
import { checkBudget } from "#diagrams/types/kit/budget"
import { formSchema, itemList } from "#diagrams/types/kit/form"
import { itemFields } from "#diagrams/types/kit/items"
import {
  emptyScene,
  type Scene,
  type Tools,
  type TypeModule,
} from "#diagrams/types/kit/scene"
import { type Box, placeLabels, type Spot } from "#diagrams/types/layout/labels"
import {
  arrowheadAt,
  circleAt,
  itemDatum,
  lineAt,
  markIds,
  rectAt,
  textAt,
} from "#diagrams/types/layout/shapes"

// Quadrant (diagram-design's `type-quadrant.md`): a 2×2 frame, an axis cross
// through its centre with one word at each tip, the four quadrants named in
// their outer corners and the items as small labelled dots placed by their
// `x` and `y` from 0 to 100. Labels never overlap; the focal item is the
// one "do first" dot in the accent.

const PLOT = 480
const TOP = 64
const DOT = 4

const LIMITS = [{ max: 12, what: "elementos" }]

const text = z.string().min(1)

/** A coordinate from 0 to 100, as both forms of this family take it. */
export const percent = z
  .number()
  .min(0, { error: "Va de 0 a 100" })
  .max(100, { error: "Va de 0 a 100" })

const axis = z.strictObject({
  label: text.meta({ description: "El nombre del eje" }),
  low: text.meta({ description: "Una palabra en su extremo bajo" }),
  high: text.meta({ description: "Una palabra en su extremo alto" }),
})

function itemSchema(references: References) {
  return z.strictObject({
    ...itemFields(references),
    x: percent.meta({ description: "De 0 (izquierda) a 100 (derecha)" }),
    y: percent.meta({ description: "De 0 (abajo) a 100 (arriba)" }),
  })
}

const items = itemSchema({})

function schema(references: References) {
  return formSchema("quadrant", [], {
    x: axis.meta({ description: "El eje horizontal" }),
    y: axis.meta({ description: "El eje vertical" }),
    quadrants: z.tuple([text, text, text, text]).meta({
      description:
        "Los nombres de los cuadrantes: arriba a la izquierda, arriba a la derecha, abajo a la izquierda, abajo a la derecha",
    }),
    items: z.array(itemSchema(references)).meta({
      description: "Los elementos, cada uno en su x y su y",
    }),
  })
}

type Axis = z.infer<typeof axis>

function axisOf(value: unknown, key: string, tools: Tools): Axis {
  const parsed = axis.safeParse(value)
  if (parsed.success) return parsed.data
  tools.report(key, "Es { label, low, high }, tres textos")
  return { label: "", low: "", high: "" }
}

function quadrantsOf(value: unknown, tools: Tools): string[] {
  const parsed = z.tuple([text, text, text, text]).safeParse(value)
  if (parsed.success) return parsed.data
  tools.report(
    "quadrants",
    "Son cuatro nombres: arriba a la izquierda, arriba a la derecha, abajo a la izquierda y abajo a la derecha"
  )
  return ["", "", "", ""]
}

/** The quadrant an item at (x, y) falls in, as an index of `quadrants`. */
export function quadrantIndex(x: number, y: number): number {
  const right = x >= 50 ? 1 : 0
  const bottom = y < 50 ? 2 : 0
  return right + bottom
}

function read(data: Record<string, unknown>, tools: Tools): Scene {
  const x = axisOf(data.x, "x", tools)
  const y = axisOf(data.y, "y", tools)
  const quadrants = quadrantsOf(data.quadrants, tools)
  const read = itemList(items, data.items, "items", tools, {
    required: ["x", "y"],
  })
  checkBudget("Un cuadrante", LIMITS, [read.length], tools.report)

  const label = TEXT_ROLES.legend
  const tipWidth = (word: string) =>
    textWidth(word.toUpperCase(), label.size, label.font, label.tracking)
  const left = Math.ceil(Math.max(48, tipWidth(x.low) + 32))
  const right = left + PLOT
  const bottom = TOP + PLOT
  const cx = left + PLOT / 2
  const cy = TOP + PLOT / 2
  const scene = emptyScene({
    width: Math.ceil(
      right +
        Math.max(48, tipWidth(x.high) + 32, textWidth(x.label, 9, "mono") + 32)
    ),
    height: bottom + 48,
  })

  scene.under.push(
    rectAt(left, TOP, PLOT, PLOT, 0, "fill-none", "line-rule"),
    lineAt(left, cy, right, cy, "line-ink"),
    lineAt(cx, bottom, cx, TOP, "line-ink"),
    arrowheadAt([right, cy], 1, 0, "fill-ink"),
    arrowheadAt([cx, TOP], 0, -1, "fill-ink"),
    textAt(cx, TOP - 26, y.high.toUpperCase(), "legend", "middle", "text-ink"),
    textAt(cx, TOP - 12, y.label, "sub", "middle", "text-muted"),
    textAt(
      cx,
      bottom + 20,
      y.low.toUpperCase(),
      "legend",
      "middle",
      "text-ink"
    ),
    textAt(
      right + 14,
      cy + 3,
      x.high.toUpperCase(),
      "legend",
      "start",
      "text-ink"
    ),
    textAt(right + 14, cy + 17, x.label, "sub", "start", "text-muted"),
    textAt(left - 14, cy + 3, x.low.toUpperCase(), "legend", "end", "text-ink")
  )
  const corners: [number, number, "start" | "end"][] = [
    [left + 12, TOP + 20, "start"],
    [right - 12, TOP + 20, "end"],
    [left + 12, bottom - 12, "start"],
    [right - 12, bottom - 12, "end"],
  ]
  corners.forEach(([qx, qy, anchor], index) => {
    const name = quadrants[index] ?? ""
    scene.under.push(
      textAt(qx, qy, name.toUpperCase(), "legend", anchor, "text-muted")
    )
  })

  const nextId = markIds()
  const placed = read.map(({ item, written }) => ({
    item,
    px: left + (written.x / 100) * PLOT,
    py: bottom - (written.y / 100) * PLOT,
    quadrant: quadrants[quadrantIndex(written.x, written.y)] ?? "",
  }))
  const dots: Box[] = placed.map(({ px, py }) => ({
    x: px - DOT - 2,
    y: py - DOT - 2,
    w: 2 * DOT + 4,
    h: 2 * DOT + 4,
  }))
  const spots = placeLabels(
    placed.map(({ item, px, py }) => ({
      text: item.name,
      role: "item" as const,
      spots: labelSpots(px, py),
    })),
    [
      ...dots,
      { x: cx - 1, y: TOP, w: 2, h: PLOT },
      { x: left, y: cy - 1, w: PLOT, h: 2 },
    ]
  )
  placed.forEach(({ item, px, py, quadrant }, index) => {
    const dot = circleAt(px, py, DOT, dotClass(item.focal, item.hue !== null))
    scene.over.push({
      ...dot,
      hue: item.hue,
      link: item.link,
      datum: itemDatum(nextId(), item, quadrant),
    })
    const spot = spots[index]
    if (spot === null || spot === undefined) {
      tools.report(
        item.at,
        `La etiqueta de "${item.name}" no cabe sin pisar otra: sepáralo de los demás`
      )
      return
    }
    scene.over.push({
      ...textAt(
        spot.x,
        spot.y,
        item.name,
        "item",
        spot.anchor,
        labelClass(item.focal)
      ),
      link: item.link,
    })
  })

  scene.accents = read.filter(({ item }) => item.focal).length
  scene.text = [
    {
      kind: "list",
      ordered: false,
      items: placed.map(({ item, quadrant }) => [`${item.name}: ${quadrant}`]),
    },
  ]
  return scene
}

/** Right, left, above and below the dot, 10px away. */
function labelSpots(px: number, py: number): Spot[] {
  return [
    { x: px + 10, y: py + 4, anchor: "start" },
    { x: px - 10, y: py + 4, anchor: "end" },
    { x: px, y: py - 10, anchor: "middle" },
    { x: px, y: py + 18, anchor: "middle" },
  ]
}

function dotClass(focal: boolean, hued: boolean): string {
  if (focal) return "fill-accent"
  if (hued) return "fill-hue"
  return "fill-ink"
}

function labelClass(focal: boolean): string {
  if (focal) return "text-accent"
  return "text-ink"
}

export const quadrant: TypeModule = {
  name: "quadrant",
  label: "Un cuadrante",
  keys: ["x", "y", "quadrants", "items"],
  variants: [],
  schema,
  read: (data, tools) => read(data, tools),
}
