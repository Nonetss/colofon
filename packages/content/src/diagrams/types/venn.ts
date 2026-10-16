import { z } from "zod"
import { textWidth } from "#pages/diagram-measure"
import { salvagedList } from "#pages/diagram-read"
import type { Hue, References } from "#pages/diagram-schema"
import { checkBudget } from "#pages/diagram-types/budget"
import { formSchema, itemList } from "#pages/diagram-types/form"
import { type Item, itemFields } from "#pages/diagram-types/items"
import {
  circleAt,
  itemDatum,
  markIds,
  textAt,
} from "#pages/diagram-types/layout/shapes"
import {
  emptyScene,
  type Graphic,
  type Scene,
  type Tools,
  type TypeModule,
} from "#pages/diagram-types/scene"
import type { Point } from "#pages/diagrams"

// Venn (diagram-design's `type-venn.md`): two or three overlapping circles
// of equal size, each tinted faintly in its own hue so the tints compound
// where they meet, the set names outside the circles and each region's
// label inside its intersection; one focal region in the accent.

const RADIUS = 120
/** How far each centre sits from the middle, as a share of the radius. */
const SPREAD = { two: 0.62, three: 0.66 }
const MARGIN = 32

/** The hues the sets take, in order, when they give none. */
const SET_HUES: Hue[] = ["blue", "violet", "teal"]

const LIMITS = [{ max: 3, what: "conjuntos" }]

const text = z.string().min(1)

const region = z.strictObject({
  sets: z.array(z.string()).min(2).meta({
    description: "Los ids de los conjuntos que se cruzan (2 o 3)",
  }),
  label: text.meta({ description: "Lo que hay en ese cruce" }),
  focal: z.boolean().optional().meta({
    description: "true: el cruce que importa, en el color de acento",
  }),
})

function schema(references: References) {
  return formSchema("venn", [], {
    sets: z
      .array(z.strictObject(itemFields(references)))
      .min(2)
      .max(3)
      .meta({ description: "Los conjuntos (2 o 3), cada uno con id" }),
    regions: z.array(region).optional().meta({
      description: "Los cruces, cada uno con los conjuntos que lo forman",
    }),
  })
}

const sets = z.strictObject(itemFields({}))

type VennSet = { item: Item; centre: Point; hue: Hue }

/** The centres of `count` circles around (cx, cy): two side by side, three in a triangle. */
export function centresOf(count: number, cx: number, cy: number): Point[] {
  if (count === 2) {
    const d = SPREAD.two * RADIUS
    return [
      [cx - d, cy],
      [cx + d, cy],
    ]
  }
  const d = SPREAD.three * RADIUS
  const centres: Point[] = []
  for (let index = 0; index < count; index++) {
    const angle = (angleOf(index, count) * Math.PI) / 180
    centres.push([cx + d * Math.cos(angle), cy + d * Math.sin(angle)])
  }
  return centres
}

/** Two on top and one below for three sets; evenly round for more. */
function angleOf(index: number, count: number): number {
  const three = [-150, -30, 90][index]
  if (count === 3 && three !== undefined) return three
  return -90 + (360 / count) * index
}

function read(data: Record<string, unknown>, tools: Tools): Scene | null {
  const read = itemList(sets, data.sets, "sets", tools, { needsId: true })
  if (read.length < 2) {
    tools.report("sets", "Un Venn tiene 2 o 3 conjuntos")
    if (read.length === 0) return null
  }
  checkBudget("Un Venn", LIMITS, [read.length], tools.report)
  const regions = salvagedList(
    region,
    data.regions,
    "regions",
    ["sets", "label"],
    tools.report,
    false
  ).filter(({ at, value }) => {
    const unknown = value.sets.filter(
      (id) => !read.some(({ item }) => item.id === id)
    )
    for (const id of unknown)
      tools.report(`${at}.sets`, `\`${id}\` no es ninguno de los conjuntos`)
    return unknown.length === 0
  })

  // Lay the circles around (0, 0), then shift everything into view.
  const centres = centresOf(read.length, 0, 0)
  const placed: VennSet[] = read.map(({ item }, index) => ({
    item,
    centre: centres[index] ?? [0, 0],
    hue: setHue(item.hue, index),
  }))
  const graphics: Graphic[] = []
  const nextId = markIds()
  for (const set of placed) {
    const [x, y] = set.centre
    graphics.push({
      ...circleAt(x, y, RADIUS, "fill-hue"),
      hue: set.hue,
      opacity: 0.08,
      link: set.item.link,
      datum: itemDatum(nextId(), set.item, set.item.sub.join(" · ")),
    })
  }
  for (const set of placed) {
    const [x, y] = set.centre
    graphics.push({
      ...circleAt(x, y, RADIUS, "fill-none", "line-hue"),
      hue: set.hue,
    })
  }
  for (const set of placed) graphics.push(...setLabel(set, centres))
  for (const { value } of regions) {
    const [x, y] = regionCentre(value.sets, placed)
    graphics.push(
      textAt(
        x,
        y + 4,
        value.label,
        "name",
        "middle",
        regionClass(value.focal === true)
      )
    )
  }

  const bounds = boundsOf(graphics)
  const dx = MARGIN - bounds.left
  const dy = MARGIN - bounds.top
  const scene = emptyScene({
    width: Math.ceil(bounds.right - bounds.left + 2 * MARGIN),
    height: Math.ceil(bounds.bottom - bounds.top + 2 * MARGIN),
  })
  scene.over = graphics.map((graphic) => shifted(graphic, dx, dy))
  scene.accents =
    regions.filter(({ value }) => value.focal === true).length +
    read.filter(({ item }) => item.focal).length
  scene.text = [
    {
      kind: "list",
      ordered: false,
      items: placed.map(({ item }) => [item.name]),
    },
  ]
  if (regions.length > 0)
    scene.text.push({
      kind: "list",
      ordered: false,
      items: regions.map(({ value }) => [
        `${value.sets.map((id) => nameOf(id, placed)).join(" ∩ ")}: ${value.label}`,
      ]),
    })
  return scene
}

function setHue(own: Hue | null, index: number): Hue {
  if (own !== null) return own
  return SET_HUES[index % SET_HUES.length] ?? "blue"
}

function nameOf(id: string, placed: readonly VennSet[]): string {
  const found = placed.find(({ item }) => item.id === id)
  if (found === undefined) return id
  return found.item.name
}

/** A set's name outside its circle, on the side away from the others. */
function setLabel(set: VennSet, centres: readonly Point[]): Graphic[] {
  const [x, y] = set.centre
  const mx = centres.reduce((sum, [cx]) => sum + cx, 0) / centres.length
  const my = centres.reduce((sum, [, cy]) => sum + cy, 0) / centres.length
  const length = Math.hypot(x - mx, y - my)
  const ux = (x - mx) / length
  const uy = (y - my) / length
  const lx = x + ux * (RADIUS + 14)
  const ly = y + uy * (RADIUS + 14)
  const anchor = anchorOf(ux)
  const top = uy > 0.5 ? ly + 12 : ly
  const name: Graphic = {
    ...textAt(lx, top, set.item.name, "name", anchor, "text-hue"),
    hue: set.hue,
    link: set.item.link,
  }
  const subs = set.item.sub.map((line, index) =>
    textAt(lx, top + 14 * (index + 1), line, "sub", anchor, "text-muted")
  )
  return [name, ...subs]
}

function anchorOf(ux: number): "start" | "middle" | "end" {
  if (ux < -0.3) return "end"
  if (ux > 0.3) return "start"
  return "middle"
}

/**
 * Where a region's label goes: between the centres of its sets, pushed away
 * from any set it leaves out, so it lands in that intersection alone.
 */
export function regionCentre(
  ids: readonly string[],
  placed: readonly VennSet[]
): Point {
  const inside = placed.filter(
    ({ item }) => item.id !== null && ids.includes(item.id)
  )
  const outside = placed.filter(
    ({ item }) => item.id === null || !ids.includes(item.id)
  )
  const mx =
    inside.reduce((sum, { centre }) => sum + centre[0], 0) / inside.length
  const my =
    inside.reduce((sum, { centre }) => sum + centre[1], 0) / inside.length
  let x = mx
  let y = my
  for (const { centre } of outside) {
    const length = Math.hypot(mx - centre[0], my - centre[1])
    if (length === 0) continue
    x += ((mx - centre[0]) / length) * RADIUS * 0.3
    y += ((my - centre[1]) / length) * RADIUS * 0.3
  }
  return [x, y]
}

function regionClass(focal: boolean): string {
  if (focal) return "text-accent"
  return "text-ink"
}

type Bounds = { left: number; top: number; right: number; bottom: number }

function boundsOf(graphics: readonly Graphic[]): Bounds {
  const bounds = {
    left: Infinity,
    top: Infinity,
    right: -Infinity,
    bottom: -Infinity,
  }
  const add = (left: number, top: number, right: number, bottom: number) => {
    bounds.left = Math.min(bounds.left, left)
    bounds.top = Math.min(bounds.top, top)
    bounds.right = Math.max(bounds.right, right)
    bounds.bottom = Math.max(bounds.bottom, bottom)
  }
  for (const graphic of graphics) {
    if (graphic.kind === "circle")
      add(
        graphic.cx - graphic.r,
        graphic.cy - graphic.r,
        graphic.cx + graphic.r,
        graphic.cy + graphic.r
      )
    if (graphic.kind === "text") {
      const width = textWidth(graphic.text, 12, "sans")
      const left = textLeft(graphic.x, width, graphic.anchor)
      add(left, graphic.y - 12, left + width, graphic.y + 4)
    }
  }
  return bounds
}

function textLeft(
  x: number,
  width: number,
  anchor: "start" | "middle" | "end"
): number {
  if (anchor === "middle") return x - width / 2
  if (anchor === "end") return x - width
  return x
}

function shifted(graphic: Graphic, dx: number, dy: number): Graphic {
  if (graphic.kind === "circle")
    return { ...graphic, cx: graphic.cx + dx, cy: graphic.cy + dy }
  if (graphic.kind === "text")
    return { ...graphic, x: graphic.x + dx, y: graphic.y + dy }
  return graphic
}

export const venn: TypeModule = {
  name: "venn",
  label: "Un Venn",
  keys: ["sets", "regions"],
  variants: [],
  schema,
  read: (data, tools) => read(data, tools),
}
