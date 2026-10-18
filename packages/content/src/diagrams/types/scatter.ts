import { z } from "zod"
import { textWidth } from "#diagrams/measure"
import type { Graphic, Paint } from "#diagrams/model"
import { optional, type Report, salvagedList } from "#diagrams/report"
import { HUES, type Hue } from "#diagrams/schema"
import {
  label,
  maskedLabel,
  type Plot,
  rule,
  shape,
  tickText,
  tickWidth,
  tinted,
} from "#diagrams/types/kit/axes"
import { checkBudget } from "#diagrams/types/kit/budget"
import { seriesHue } from "#diagrams/types/kit/charts"
import { formSchema } from "#diagrams/types/kit/form"
import { datumOf, markIds } from "#diagrams/types/kit/marks"
import {
  emptyScene,
  type Scene,
  type Tools,
  type TypeModule,
} from "#diagrams/types/kit/scene"
import {
  formatFields,
  formatNumber,
  numberSchema,
  type ValueFormat,
} from "#diagrams/types/kit/values"
import { placeLabels, type Spot, textBox } from "#diagrams/types/layout/labels"
import { linearScale, type Scale } from "#diagrams/types/layout/scale"

// Scatter (diagram-design's `type-scatter.md`): points on two round axes,
// coloured by group, only the focal points and the named ones labelled, and
// no label over another. `bubble` scales each dot's area by its `size`;
// `beeswarm` lays the dots along x in one row per group, pushed apart so
// none overlap.

const VARIANTS = ["bubble", "beeswarm"] as const

const LIMITS = [
  { max: 60, what: "puntos" },
  { max: 6, what: "etiquetas" },
  { max: 5, what: "grupos" },
]

const text = z.string().min(1)

const axisSchema = z.strictObject({
  label: text.meta({ description: "Qué mide el eje" }),
  min: numberSchema.optional().meta({ description: "Dónde empieza" }),
  max: numberSchema.optional().meta({ description: "Dónde acaba" }),
})

const pointSchema = z.strictObject({
  name: text.optional().meta({
    description: "Su nombre; un punto con nombre lleva etiqueta",
  }),
  x: numberSchema,
  y: numberSchema.optional().meta({ description: "Sin uso con beeswarm" }),
  group: text.optional().meta({ description: "Su grupo: su color" }),
  size: numberSchema.optional().meta({
    description: "Con bubble, su área es proporcional a este valor",
  }),
  focal: z.boolean().optional().meta({
    description: "true: va en el color de acento",
  }),
  info: text.optional(),
})

type Point = z.infer<typeof pointSchema>
type Axis = z.infer<typeof axisSchema>

function schema() {
  return formSchema("scatter", VARIANTS, {
    x: axisSchema,
    y: axisSchema.optional().meta({ description: "Sin uso con beeswarm" }),
    points: z.array(pointSchema).min(1),
    ...formatFields(),
  })
}

const fields = formatFields()

/** The most a bubble's radius grows to. */
const MAX_RADIUS = 28

function read(
  data: Record<string, unknown>,
  tools: Tools,
  variant: string | null
): Scene | null {
  const { report } = tools
  const x = axisOf(data.x, "x", report)
  if (x === null) return null
  const swarm = variant === "beeswarm"
  const y = yAxisOf(data.y, swarm, report)
  const points = salvagedList(pointSchema, data.points, "points", ["x"], report)
    .filter(({ at, value }) => {
      if (swarm || value.y !== undefined) return true
      report(`${at}.y`, "Falta: un punto lleva x e y")
      return false
    })
    .map(({ value }) => value)
  const format: ValueFormat = {
    unit: optional(fields.unit, data.unit, "unit", report) ?? null,
    decimals: optional(fields.decimals, data.decimals, "decimals", report) ?? 0,
  }
  const groups = groupsOf(points)
  const labelled = points.filter(isLabelled)
  checkBudget(
    "Un gráfico de dispersión",
    LIMITS,
    [points.length, labelled.length, groups.length],
    report
  )
  if (variant === "bubble")
    for (const [index, point] of points.entries())
      if (point.size === undefined || point.size <= 0)
        report(
          `points.${index}.size`,
          "Una burbuja lleva size, un número mayor que 0"
        )
  const scene = sceneOf(x, y, points, groups, format, variant, report)
  scene.accents = points.filter((point) => point.focal === true).length
  scene.legend = groups.map((group, index) => ({
    name: group,
    sample: { kind: "dot", classes: ["fill-hue"], hue: groupHue(index) },
    series: group,
  }))
  scene.text = [tableOf(x, y, points, format, variant)]
  return scene
}

function sceneOf(
  x: Axis,
  y: Axis | null,
  points: readonly Point[],
  groups: readonly string[],
  format: ValueFormat,
  variant: string | null,
  report: Report
): Scene {
  if (variant === "beeswarm")
    return swarmScene(x, points, groups, format, report)
  return plotScene(x, y, points, groups, format, variant === "bubble", report)
}

function axisOf(value: unknown, key: string, report: Report): Axis | null {
  if (value === undefined) {
    report(key, "Falta: es obligatorio")
    return null
  }
  return optional(axisSchema, value, key, report) ?? null
}

function yAxisOf(value: unknown, swarm: boolean, report: Report): Axis | null {
  if (swarm) return null
  return axisOf(value, "y", report)
}

function isLabelled(point: Point): boolean {
  return point.name !== undefined || point.focal === true
}

/** The groups in order of appearance. */
function groupsOf(points: readonly Point[]): string[] {
  const groups: string[] = []
  for (const point of points)
    if (point.group !== undefined && !groups.includes(point.group))
      groups.push(point.group)
  return groups
}

function groupHue(index: number): Hue {
  return seriesHue(index, undefined, HUES)
}

function pointPaint(point: Point, groups: readonly string[]): Paint {
  if (point.focal === true)
    return tinted(null, null, "fill-accent", "line-paper")
  if (point.group === undefined)
    return tinted(null, null, "fill-muted", "line-paper")
  return tinted(
    groupHue(groups.indexOf(point.group)),
    null,
    "fill-hue",
    "line-paper"
  )
}

function bubblePaint(point: Point, groups: readonly string[]): Paint {
  if (point.focal === true)
    return tinted(null, 0.35, "fill-accent", "line-accent")
  if (point.group === undefined)
    return tinted(null, 0.2, "fill-muted", "line-muted")
  return tinted(
    groupHue(groups.indexOf(point.group)),
    0.35,
    "fill-hue",
    "line-hue"
  )
}

function domain(axis: Axis, values: readonly number[]): [number, number] {
  const low = givenOr(axis.min, Math.min(...values))
  const high = givenOr(axis.max, Math.max(...values))
  return [low, high]
}

function axisOrEmpty(axis: Axis | null): Axis {
  if (axis !== null) return axis
  return { label: "" }
}

function givenOr(given: number | undefined, fallback: number): number {
  if (given !== undefined) return given
  return fallback
}

function nameOf(point: Point, index: number): string {
  if (point.name !== undefined) return point.name
  return `Punto ${index + 1}`
}

function seriesOf(point: Point): string | null {
  return point.group ?? null
}

/** The axis's ticks and gridlines; `vertical` for the y axis. */
function axisGraphics(scale: Scale, plot: Plot, vertical: boolean): Graphic[] {
  const parts: Graphic[] = []
  for (const tick of scale.ticks) {
    const at = scale.at(tick)
    const value = tickText(tick, scale.ticks)
    if (vertical) {
      parts.push(rule(plot.left, at, plot.right, at, "line-rule"))
      parts.push(label(plot.left - 8, at + 3, value, "tick", "end"))
    } else {
      parts.push(rule(at, plot.top, at, plot.bottom, "line-rule"))
      parts.push(label(at, plot.bottom + 14, value, "tick", "middle"))
    }
  }
  return parts
}

function plotScene(
  xAxis: Axis,
  yAxis: Axis | null,
  points: readonly Point[],
  groups: readonly string[],
  format: ValueFormat,
  bubbles: boolean,
  report: Report
): Scene {
  const [x0, x1] = domain(
    xAxis,
    points.map((point) => point.x)
  )
  const ys = points.map((point) => point.y ?? 0)
  const [y0, y1] = domain(axisOrEmpty(yAxis), ys)
  const probe = linearScale(y0, y1, 0, 1)
  const left = 40 + tickWidth(probe) + 12
  // Room above the plot for a bubble at the top of the axis.
  const top = bubbles ? 24 + MAX_RADIUS : 24
  const plot: Plot = { left, top, right: left + 480, bottom: top + 320 }
  const xs = linearScale(x0, x1, plot.left, plot.right)
  const yScale = linearScale(y0, y1, plot.bottom, plot.top)
  const scene = emptyScene({ width: plot.right + 48, height: plot.bottom + 44 })
  scene.under.push(
    ...axisGraphics(xs, plot, false),
    ...axisGraphics(yScale, plot, true),
    rule(plot.left, plot.bottom, plot.right, plot.bottom, "line-soft"),
    rule(plot.left, plot.top, plot.left, plot.bottom, "line-soft"),
    label(
      (plot.left + plot.right) / 2,
      plot.bottom + 34,
      xAxis.label.toUpperCase(),
      "legend",
      "middle"
    ),
    label(
      plot.left,
      plot.top - 10,
      (yAxis?.label ?? "").toUpperCase(),
      "legend",
      "start"
    )
  )
  const biggest = Math.max(1, ...points.map((point) => point.size ?? 0))
  const next = markIds()
  const placed: {
    point: Point
    index: number
    cx: number
    cy: number
    r: number
  }[] = []
  points.forEach((point, index) => {
    const cx = xs.at(point.x)
    const cy = yScale.at(point.y ?? 0)
    const r = radiusOf(point, biggest, bubbles)
    placed.push({ point, index, cx, cy, r })
  })
  // Bigger bubbles first, so the small ones stay on top.
  const order = [...placed].sort((a, b) => b.r - a.r)
  for (const { point, index, cx, cy, r } of order) {
    const value = `${xAxis.label} ${formatNumber(point.x, format)} · ${yAxis?.label ?? ""} ${formatNumber(point.y ?? 0, format)}`
    const look = bubbles
      ? bubblePaint(point, groups)
      : pointPaint(point, groups)
    if (bubbles)
      scene.over.push(
        shape({ kind: "circle", cx, cy, r }, tinted(null, null, "fill-paper"))
      )
    scene.over.push(
      shape(
        { kind: "circle", cx, cy, r },
        {
          ...look,
          datum: datumOf(
            next(),
            nameOf(point, index),
            seriesOf(point),
            value,
            point.info ?? null
          ),
        }
      )
    )
  }
  scene.over.push(...pointLabels(placed, report))
  widenToFit(scene)
  return scene
}

function radiusOf(point: Point, biggest: number, bubbles: boolean): number {
  if (!bubbles) return 4
  const size = Math.max(0, point.size ?? 0)
  return Math.max(2, Math.sqrt(size / biggest) * MAX_RADIUS)
}

/** The labels of the focal and named points, placed so none overlap. */
function pointLabels(
  placed: readonly {
    point: Point
    index: number
    cx: number
    cy: number
    r: number
  }[],
  report: Report
): Graphic[] {
  const wanted = placed.filter(({ point }) => isLabelled(point))
  const spots = placeLabels(
    wanted.map(({ point, index, cx, cy, r }) => ({
      text: nameOf(point, index).toUpperCase(),
      role: "label" as const,
      spots: candidates(cx, cy, r),
    })),
    placed
      .filter(({ point }) => !isLabelled(point))
      .map(({ cx, cy, r }) => ({ x: cx - r, y: cy - r, w: 2 * r, h: 2 * r }))
  )
  const labels: Graphic[] = []
  wanted.forEach(({ point, index }, position) => {
    const spot = spots[position]
    const name = nameOf(point, index)
    if (spot === null || spot === undefined) {
      report(`points.${index}`, `La etiqueta "${name}" no cabe sin tapar otra`)
      return
    }
    labels.push(
      maskedLabel(
        spot.x,
        spot.y,
        name.toUpperCase(),
        "label",
        spot.anchor,
        "text-ink"
      )
    )
  })
  return labels
}

function candidates(cx: number, cy: number, r: number): Spot[] {
  return [
    { x: cx + r + 4, y: cy + 3, anchor: "start" },
    { x: cx - r - 4, y: cy + 3, anchor: "end" },
    { x: cx, y: cy - r - 4, anchor: "middle" },
    { x: cx, y: cy + r + 11, anchor: "middle" },
  ]
}

/** A row per group (one with no groups), the dots pushed apart along y. */
function swarmScene(
  xAxis: Axis,
  points: readonly Point[],
  groups: readonly string[],
  format: ValueFormat,
  report: Report
): Scene {
  const rows = groups.length > 0 ? groups : [""]
  const nameWidth = Math.max(
    0,
    ...rows.map((row) => textWidth(row, 11, "sans"))
  )
  const left = 24 + nameWidth + 16
  const [x0, x1] = domain(
    xAxis,
    points.map((point) => point.x)
  )
  const radius = 4
  const placedRows = rows.map((row) => {
    const members = points
      .map((point, index) => ({ point, index }))
      .filter(({ point }) => (point.group ?? "") === row || groups.length === 0)
    return [...members].sort((a, b) => a.point.x - b.point.x)
  })
  const plotRight = left + 520
  const xs = linearScale(x0, x1, left, plotRight)
  const heights = rows.map((_, index) =>
    rowHeight(placedRows[index] ?? [], xs, radius)
  )
  let y = 24
  const scene = emptyScene({ width: plotRight + 40, height: 0 })
  const next = markIds()
  const dots: {
    point: Point
    index: number
    cx: number
    cy: number
    r: number
  }[] = []
  rows.forEach((row, index) => {
    const height = heights[index] ?? 24
    const centre = y + height / 2
    scene.under.push(rule(left, centre, plotRight, centre, "line-rule"))
    if (row !== "")
      scene.under.push(
        label(left - 12, centre + 4, row, "item", "end", "text-bold")
      )
    for (const dot of layOut(placedRows[index] ?? [], xs, radius)) {
      const { point, index: at } = dot
      dots.push({
        point,
        index: at,
        cx: dot.cx,
        cy: centre + dot.dy,
        r: radius,
      })
      scene.over.push(
        shape(
          { kind: "circle", cx: dot.cx, cy: centre + dot.dy, r: radius },
          {
            ...pointPaint(point, groups),
            datum: datumOf(
              next(),
              nameOf(point, at),
              seriesOf(point),
              `${xAxis.label} ${formatNumber(point.x, format)}`,
              point.info ?? null
            ),
          }
        )
      )
    }
    y += height + 8
  })
  const plot: Plot = { left, top: 16, right: plotRight, bottom: y }
  scene.under.push(...axisGraphics(xs, plot, false))
  scene.under.push(
    label(
      (left + plotRight) / 2,
      y + 34,
      xAxis.label.toUpperCase(),
      "legend",
      "middle"
    )
  )
  scene.size = { width: plotRight + 40, height: y + 44 }
  scene.over.push(...pointLabels(dots, report))
  widenToFit(scene)
  return scene
}

type SwarmMember = { point: Point; index: number }

/** Each dot of a row with its offset from the row's centre line. */
function layOut(
  members: readonly SwarmMember[],
  xs: Scale,
  radius: number
): (SwarmMember & { cx: number; dy: number })[] {
  const placed: (SwarmMember & { cx: number; dy: number })[] = []
  const gap = 2 * radius + 1
  for (const member of members) {
    const cx = xs.at(member.point.x)
    for (let step = 0; ; step++) {
      const dy = Math.ceil(step / 2) * gap * sideOf(step)
      const free = placed.every(
        (other) => Math.hypot(other.cx - cx, other.dy - dy) >= gap
      )
      if (!free) continue
      placed.push({ ...member, cx, dy })
      break
    }
  }
  return placed
}

/** Up for odd tries, down for even ones. */
function sideOf(step: number): number {
  if (step % 2 === 1) return -1
  return 1
}

function rowHeight(
  members: readonly SwarmMember[],
  xs: Scale,
  radius: number
): number {
  const placed = layOut(members, xs, radius)
  const spread = Math.max(0, ...placed.map((dot) => Math.abs(dot.dy)))
  return Math.max(24, 2 * spread + 2 * radius + 8)
}

function tableOf(
  x: Axis,
  y: Axis | null,
  points: readonly Point[],
  format: ValueFormat,
  variant: string | null
) {
  const head = ["", x.label]
  if (y !== null) head.push(y.label)
  if (variant === "bubble") head.push("Tamaño")
  const withGroups = points.some((point) => point.group !== undefined)
  if (withGroups) head.push("Grupo")
  return {
    kind: "table" as const,
    head,
    rows: points.map((point, index) => {
      const row = [nameOf(point, index), formatNumber(point.x, format)]
      if (y !== null) row.push(formatNumber(point.y ?? 0, format))
      if (variant === "bubble") row.push(formatNumber(point.size ?? 0, format))
      if (withGroups) row.push(point.group ?? "")
      return row
    }),
  }
}

export const scatter: TypeModule = {
  name: "scatter",
  label: "Un gráfico de dispersión",
  keys: ["x", "y", "points", "unit", "decimals"],
  variants: VARIANTS,
  schema,
  read,
}

/** Widens the drawing so the dots and labels at its right edge fit whole. */
function widenToFit(scene: Scene) {
  let right = scene.size.width
  for (const graphic of scene.over) {
    if (graphic.kind === "circle")
      right = Math.max(right, graphic.cx + graphic.r + 16)
    if (graphic.kind === "text") {
      const box = textBox(graphic.text, graphic.role, graphic)
      right = Math.max(right, box.x + box.w + 16)
    }
  }
  scene.size = { ...scene.size, width: Math.ceil(right) }
}
