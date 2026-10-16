import { z } from "zod"
import { textWidth } from "#pages/diagram-measure"
import { optional, type Report, salvagedList } from "#pages/diagram-read"
import { checkBudget } from "#pages/diagram-types/budget"
import { formSchema } from "#pages/diagram-types/form"
import {
  datum,
  label,
  markIds,
  matchingSeries,
  type Plot,
  rule,
  type SeriesWritten,
  seriesHue,
  seriesSchema,
  shape,
  tickWidth,
  tinted,
  valueAxis,
  xLabel,
} from "#pages/diagram-types/layout/axes"
import { placeLabels } from "#pages/diagram-types/layout/labels"
import { exactScale, linearScale } from "#pages/diagram-types/layout/scale"
import {
  emptyScene,
  type Graphic,
  type LegendEntry,
  type Paint,
  type Scene,
  type TextBlock,
  type Tools,
  type TypeModule,
} from "#pages/diagram-types/scene"
import {
  formatFields,
  formatNumber,
  type ValueFormat,
} from "#pages/diagram-types/values"

// Line charts (diagram-design's `type-line.md`): series over an ordered x
// (labels or dates) on one value axis, each named at its last point.
// Variants: `slope` compares exactly two points between two axis rules;
// `ridgeline` gives each series its own filled curve, stacked downwards;
// `stream` stacks the series around a centred baseline; `bump` draws ranks,
// rank 1 on top.

const VARIANTS = ["slope", "ridgeline", "stream", "bump"] as const

const text = z.string().min(1)

function schema() {
  return formSchema("line", VARIANTS, {
    x: z.array(text).min(1).meta({
      description: "Los puntos del eje x, en orden: etiquetas o fechas",
    }),
    series: z.array(seriesSchema).min(1).meta({
      description: "Las series, con un valor por punto (un rango con bump)",
    }),
    ...formatFields(),
  })
}

const fields = formatFields()

type Chart = {
  x: string[]
  series: SeriesWritten[]
  format: ValueFormat
}

function read(
  data: Record<string, unknown>,
  tools: Tools,
  variant: string | null
): Scene | null {
  const { report } = tools
  const written = optional(z.array(text).min(1), data.x, "x", report)
  if (written === undefined) {
    if (data.x === undefined)
      report("x", "Falta: es una lista con al menos un elemento")
    return null
  }
  const x = written.map(xLabel)
  const series = matchingSeries(
    salvagedList(
      seriesSchema,
      data.series,
      "series",
      ["name", "values"],
      report
    ),
    x.length,
    "punto de x",
    report
  ).map(({ value }) => value)
  const chart: Chart = {
    x,
    series,
    format: {
      unit: optional(fields.unit, data.unit, "unit", report) ?? null,
      decimals:
        optional(fields.decimals, data.decimals, "decimals", report) ?? 0,
    },
  }
  const many = variant === "bump" || variant === "ridgeline"
  const maxSeries = many ? 8 : 4
  checkBudget(
    "Un gráfico de líneas",
    [
      { max: 24, what: "puntos por serie" },
      { max: maxSeries, what: "series" },
    ],
    [x.length, series.length],
    report
  )
  const scene = sceneOf(chart, variant, report)
  scene.accents = series.filter((one) => one.focal === true).length
  scene.text = [table(chart)]
  return scene
}

function sceneOf(chart: Chart, variant: string | null, report: Report): Scene {
  if (variant === "slope") {
    if (chart.x.length === 2) return slopeScene(chart)
    report(
      "x",
      "Un gráfico de pendiente compara exactamente dos puntos: se dibuja como líneas"
    )
  }
  if (variant === "ridgeline") return ridgelineScene(chart)
  if (variant === "stream") return streamScene(chart)
  if (variant === "bump" && ranksAreValid(chart, report))
    return bumpScene(chart)
  return lineScene(chart)
}

/** The x labels as a table with a column per series. */
function table(chart: Chart): TextBlock {
  return {
    kind: "table",
    head: ["", ...chart.series.map((one) => one.name)],
    rows: chart.x.map((label, index) => [
      label,
      ...chart.series.map((one) =>
        formatNumber(one.values[index] ?? 0, chart.format)
      ),
    ]),
  }
}

function linePaint(one: SeriesWritten, index: number): Paint {
  if (one.focal === true)
    return tinted(null, null, "fill-none", "line-accent", "line-bold")
  return tinted(seriesHue(index, one.hue), null, "fill-none", "line-hue")
}

function dotPaint(one: SeriesWritten, index: number): Paint {
  if (one.focal === true) return tinted(null, null, "fill-accent", "line-paper")
  return tinted(seriesHue(index, one.hue), null, "fill-hue", "line-paper")
}

function nameClass(one: SeriesWritten): string[] {
  if (one.focal === true) return ["text-ink", "text-bold"]
  return ["text-hue"]
}

function polyline(points: readonly (readonly [number, number])[]): string {
  const [first, ...rest] = points
  if (first === undefined) return ""
  return [
    `M${round(first[0])} ${round(first[1])}`,
    ...rest.map(([x, y]) => `L${round(x)} ${round(y)}`),
  ].join(" ")
}

/** The first and last of `xs`, or `fallback` for both with none. */
function edges(xs: readonly number[], fallback: number): [number, number] {
  const first = xs[0]
  const last = xs.at(-1)
  if (first === undefined || last === undefined) return [fallback, fallback]
  return [first, last]
}

function round(value: number): string {
  return String(Math.round(value * 10) / 10)
}

function allValues(chart: Chart): number[] {
  const values: number[] = []
  for (const one of chart.series) values.push(...one.values)
  return values
}

/** The legend for two or more series: a line each, hovering lights it. */
function lineLegend(chart: Chart): LegendEntry[] {
  if (chart.series.length < 2) return []
  return chart.series.map((one, index) => ({
    name: one.name,
    sample: {
      kind: "line",
      classes: linePaint(one, index).classes,
      hue: linePaint(one, index).hue,
    },
    series: one.name,
  }))
}

/** The x labels under the plot, every one or every few when crowded. */
function xTicks(chart: Chart, xs: readonly number[], y: number): Graphic[] {
  const every = Math.ceil(chart.x.length / 12)
  const ticks: Graphic[] = []
  chart.x.forEach((name, index) => {
    const at = xs[index]
    if (at === undefined || index % every !== 0) return
    ticks.push(label(at, y, name, "tick", "middle"))
  })
  return ticks
}

function xPositions(count: number, left: number, step: number): number[] {
  return Array.from({ length: count }, (_, index) => left + step * index)
}

function xStep(chart: Chart): number {
  return Math.max(56, ...chart.x.map((name) => textWidth(name, 8, "mono") + 12))
}

function widestName(chart: Chart): number {
  return Math.max(
    0,
    ...chart.series.map((one) => textWidth(one.name, 9, "mono"))
  )
}

// ── Plain lines ─────────────────────────────────────────────────────────

function lineScene(chart: Chart): Scene {
  const values = allValues(chart)
  const probe = linearScale(
    Math.min(0, ...values),
    Math.max(0, ...values),
    0,
    1
  )
  const left = 24 + tickWidth(probe) + 12
  const step = xStep(chart)
  const width = Math.max(480, step * Math.max(1, chart.x.length - 1))
  const plot: Plot = { left, top: 24, right: left + width, bottom: 24 + 240 }
  const scale = linearScale(
    Math.min(0, ...values),
    Math.max(0, ...values),
    plot.bottom,
    plot.top
  )
  const xs = xPositions(chart.x.length, plot.left, xStepFor(chart, width))
  const scene = emptyScene({
    width: plot.right + widestName(chart) + 40,
    height: plot.bottom + 32,
  })
  scene.under.push(
    ...valueAxis(scale, plot, true),
    ...xTicks(chart, xs, plot.bottom + 16)
  )
  const next = markIds()
  const ends: { text: string; y: number; one: SeriesWritten; index: number }[] =
    []
  chart.series.forEach((one, index) => {
    const points = one.values.map((value, at): [number, number] => [
      xs[at] ?? 0,
      scale.at(value),
    ])
    scene.over.push(
      shape({ kind: "path", d: polyline(points) }, linePaint(one, index))
    )
    one.values.forEach((value, at) => {
      const point = points[at]
      if (point === undefined) return
      scene.over.push(
        shape(
          { kind: "circle", cx: point[0], cy: point[1], r: 3 },
          {
            ...dotPaint(one, index),
            datum: datum(
              next(),
              chart.x[at] ?? "",
              one.name,
              formatNumber(value, chart.format),
              one.info ?? null
            ),
          }
        )
      )
    })
    const last = points.at(-1)
    if (last !== undefined)
      ends.push({ text: one.name, y: last[1] + 3, one, index })
  })
  scene.over.push(...endLabels(ends, plot.right + 8))
  scene.legend = lineLegend(chart)
  return scene
}

/** The gap between two x points so they fill `width`. */
function xStepFor(chart: Chart, width: number): number {
  if (chart.x.length < 2) return 0
  return width / (chart.x.length - 1)
}

/** The series' names beside their last points, nudged so none overlap. */
function endLabels(
  ends: readonly { text: string; y: number; one: SeriesWritten }[],
  x: number
): Graphic[] {
  const spots = placeLabels(
    ends.map((end) => ({
      text: end.text,
      role: "sub" as const,
      spots: [0, -10, 10, -20, 20, -30, 30].map((dy) => ({
        x,
        y: end.y + dy,
        anchor: "start" as const,
      })),
    }))
  )
  const labels: Graphic[] = []
  ends.forEach((end, index) => {
    const spot = spots[index]
    const y = spot === null || spot === undefined ? end.y : spot.y
    labels.push({
      ...label(x, y, end.text, "sub", "start", ...nameClass(end.one)),
      hue: seriesHue(index, end.one.hue),
    })
  })
  return labels
}

// ── Slope ───────────────────────────────────────────────────────────────

function slopeScene(chart: Chart): Scene {
  const values = allValues(chart)
  const valueWidth = Math.max(
    0,
    ...values.map((value) =>
      textWidth(formatNumber(value, chart.format), 9, "mono")
    )
  )
  const gutter = widestName(chart) + valueWidth + 32
  const from = 24 + gutter
  const to = from + 360
  const top = 32
  const bottom = top + 280
  const scale = linearScale(
    Math.min(0, ...values),
    Math.max(0, ...values),
    bottom,
    top
  )
  const scene = emptyScene({ width: to + gutter + 24, height: bottom + 40 })
  scene.under.push(
    rule(from, top, from, bottom, "line-soft"),
    rule(to, top, to, bottom, "line-soft"),
    label(
      from,
      bottom + 20,
      (chart.x[0] ?? "").toUpperCase(),
      "legend",
      "middle"
    ),
    label(to, bottom + 20, (chart.x[1] ?? "").toUpperCase(), "legend", "middle")
  )
  const next = markIds()
  // Close values crowd their labels: the labels (never the dots) are
  // spread just enough to be read one under another.
  const leftYs = spread(chart.series.map((one) => scale.at(one.values[0] ?? 0)))
  const rightYs = spread(
    chart.series.map((one) => scale.at(one.values[1] ?? 0))
  )
  chart.series.forEach((one, index) => {
    const [a = 0, b = 0] = one.values
    const ya = scale.at(a)
    const yb = scale.at(b)
    const la = valueAt(leftYs, index, ya)
    const lb = valueAt(rightYs, index, yb)
    scene.over.push(rule(from, ya, to, yb, ...slopeClasses(one)))
    const look = slopePaint(one, index)
    for (const [x, y, value, at] of [
      [from, ya, a, 0],
      [to, yb, b, 1],
    ] as const)
      scene.over.push(
        shape(
          { kind: "circle", cx: x, cy: y, r: 3.5 },
          {
            ...look,
            datum: datum(
              next(),
              chart.x[at] ?? "",
              one.name,
              formatNumber(value, chart.format),
              one.info ?? null
            ),
          }
        )
      )
    const left = formatNumber(a, chart.format)
    const right = formatNumber(b, chart.format)
    scene.over.push(
      label(from - 10, la + 3, left, "sub", "end", "text-muted"),
      label(from - 18 - valueWidth, la + 3, one.name, "sub", "end", "text-ink"),
      label(to + 10, lb + 3, right, "sub", "start", "text-muted"),
      label(to + 18 + valueWidth, lb + 3, one.name, "sub", "start", "text-ink")
    )
  })
  return scene
}

function valueAt(list: readonly number[], index: number, fallback: number) {
  const value = list[index]
  if (value === undefined) return fallback
  return value
}

/** The gap between two labels read one under the other. */
const LABEL_GAP = 12

/**
 * `ys` moved apart, as little as possible, so no two are closer than a
 * label's height; each group of crowded labels stays centred on its values.
 */
export function spread(ys: readonly number[]): number[] {
  const order = ys.map((y, index) => ({ y, index })).sort((a, b) => a.y - b.y)
  const groups: { start: number; items: { y: number; index: number }[] }[] = []
  for (const item of order) {
    const last = groups.at(-1)
    if (last !== undefined) {
      const end = last.start + LABEL_GAP * last.items.length
      if (item.y < end) {
        last.items.push(item)
        const mean =
          last.items.reduce((sum, member) => sum + member.y, 0) /
          last.items.length
        last.start = mean - (LABEL_GAP * (last.items.length - 1)) / 2
        continue
      }
    }
    groups.push({ start: item.y, items: [item] })
  }
  const placed: number[] = [...ys]
  for (const group of groups)
    group.items.forEach((item, position) => {
      placed[item.index] = group.start + LABEL_GAP * position
    })
  return placed
}

function slopeClasses(one: SeriesWritten): string[] {
  if (one.focal === true) return ["line-accent", "line-bold"]
  if (one.hue !== undefined) return ["line-hue"]
  return ["line-muted"]
}

function slopePaint(one: SeriesWritten, index: number): Paint {
  if (one.focal === true) return tinted(null, null, "fill-accent")
  if (one.hue !== undefined)
    return tinted(seriesHue(index, one.hue), null, "fill-hue")
  return tinted(null, null, "fill-muted")
}

// ── Ridgeline ───────────────────────────────────────────────────────────

function ridgelineScene(chart: Chart): Scene {
  const left = 24 + widestName(chart) + 16
  const width = Math.max(480, xStep(chart) * Math.max(1, chart.x.length - 1))
  const row = 40
  const amplitude = 56
  const top = 24 + amplitude
  const xs = xPositions(chart.x.length, left, xStepFor(chart, width))
  const high = Math.max(0, ...allValues(chart))
  const lift = exactScale(0, high, 0, amplitude)
  const bottom = top + row * Math.max(0, chart.series.length - 1)
  const scene = emptyScene({ width: left + width + 32, height: bottom + 40 })
  scene.under.push(...xTicks(chart, xs, bottom + 20))
  const next = markIds()
  chart.series.forEach((one, index) => {
    const base = top + row * index
    const points = one.values.map((value, at): [number, number] => [
      xs[at] ?? 0,
      base - lift(Math.max(0, value)),
    ])
    const [first, last] = edges(xs, left)
    const area = `${polyline(points)} L${round(last)} ${round(base)} L${round(first)} ${round(base)} Z`
    scene.over.push(
      shape({ kind: "path", d: area }, ridgePaint(one, index)),
      rule(first, base, last, base, "line-rule"),
      {
        ...label(left - 12, base, one.name, "sub", "end", ...nameClass(one)),
        hue: seriesHue(index, one.hue),
      }
    )
    one.values.forEach((value, at) => {
      const point = points[at]
      if (point === undefined) return
      scene.over.push(
        shape(
          { kind: "circle", cx: point[0], cy: point[1], r: 2 },
          {
            ...dotPaint(one, index),
            datum: datum(
              next(),
              chart.x[at] ?? "",
              one.name,
              formatNumber(value, chart.format),
              one.info ?? null
            ),
          }
        )
      )
    })
  })
  return scene
}

function ridgePaint(one: SeriesWritten, index: number): Paint {
  if (one.focal === true)
    return tinted(null, null, "fill-accent-tint", "line-accent")
  return tinted(seriesHue(index, one.hue), null, "fill-hue-tint", "line-hue")
}

// ── Stream ──────────────────────────────────────────────────────────────

function streamScene(chart: Chart): Scene {
  const left = 32
  const width = Math.max(480, xStep(chart) * Math.max(1, chart.x.length - 1))
  const top = 24
  const height = 240
  const middle = top + height / 2
  const xs = xPositions(chart.x.length, left, xStepFor(chart, width))
  const totals = chart.x.map((_, at) =>
    chart.series.reduce((sum, one) => sum + Math.max(0, one.values[at] ?? 0), 0)
  )
  const k = exactScale(0, Math.max(1, ...totals), 0, height)
  const scene = emptyScene({
    width: left + width + 32,
    height: top + height + 32,
  })
  scene.under.push(...xTicks(chart, xs, top + height + 16))
  const floor = totals.map((total) => -total / 2)
  const next = markIds()
  chart.series.forEach((one, index) => {
    const lower: [number, number][] = []
    const upper: [number, number][] = []
    chart.x.forEach((_, at) => {
      const start = floor[at] ?? 0
      const value = Math.max(0, one.values[at] ?? 0)
      const x = xs[at] ?? 0
      lower.push([x, middle - k(start)])
      upper.push([x, middle - k(start + value)])
      floor[at] = start + value
    })
    const d = `${polyline(upper)} ${lower
      .reverse()
      .map(([x, y]) => `L${round(x)} ${round(y)}`)
      .join(" ")} Z`
    const total = one.values.reduce((sum, value) => sum + value, 0)
    scene.over.push(
      shape(
        { kind: "path", d },
        {
          ...streamPaint(one, index),
          datum: datum(
            next(),
            one.name,
            one.name,
            `${formatNumber(total, chart.format)} en total`,
            one.info ?? null
          ),
        }
      )
    )
  })
  scene.legend = chart.series.map((one, index) => ({
    name: one.name,
    sample: {
      kind: "swatch",
      classes: streamPaint(one, index).classes,
      hue: streamPaint(one, index).hue,
    },
    series: one.name,
  }))
  return scene
}

function streamPaint(one: SeriesWritten, index: number): Paint {
  if (one.focal === true) return tinted(null, null, "fill-accent", "line-paper")
  return tinted(seriesHue(index, one.hue), null, "fill-hue-tint", "line-hue")
}

// ── Bump ────────────────────────────────────────────────────────────────

/** Ranks are whole numbers from 1; any other value is reported. */
function ranksAreValid(chart: Chart, report: Report): boolean {
  let valid = true
  chart.series.forEach((one, index) => {
    one.values.forEach((value, at) => {
      if (Number.isInteger(value) && value >= 1) return
      report(
        `series.${index}.values.${at}`,
        "Un rango es un número entero desde 1: se dibuja como líneas"
      )
      valid = false
    })
  })
  return valid
}

function bumpScene(chart: Chart): Scene {
  const name = widestName(chart)
  const left = 24 + name + 16
  const width = Math.max(360, xStep(chart) * Math.max(1, chart.x.length - 1))
  const top = 32
  const rowGap = 28
  const lowest = Math.max(1, ...allValues(chart))
  const y = (rank: number) => top + rowGap * (rank - 1)
  const xs = xPositions(chart.x.length, left, xStepFor(chart, width))
  const bottom = y(lowest)
  const scene = emptyScene({
    width: left + width + name + 40,
    height: bottom + 40,
  })
  scene.under.push(...xTicks(chart, xs, bottom + 24))
  const next = markIds()
  chart.series.forEach((one, index) => {
    const points = one.values.map((rank, at): [number, number] => [
      xs[at] ?? 0,
      y(rank),
    ])
    scene.over.push(
      shape({ kind: "path", d: polyline(points) }, bumpLine(one, index))
    )
    one.values.forEach((rank, at) => {
      const point = points[at]
      if (point === undefined) return
      scene.over.push(
        shape(
          { kind: "circle", cx: point[0], cy: point[1], r: 8 },
          {
            ...dotPaint(one, index),
            datum: datum(
              next(),
              chart.x[at] ?? "",
              one.name,
              `${rank}º`,
              one.info ?? null
            ),
          }
        ),
        label(
          point[0],
          point[1] + 3,
          String(rank),
          "tick",
          "middle",
          "text-paper"
        )
      )
    })
    const first = points[0]
    const last = points.at(-1)
    if (first !== undefined)
      scene.over.push({
        ...label(
          first[0] - 14,
          first[1] + 3,
          one.name,
          "sub",
          "end",
          ...nameClass(one)
        ),
        hue: seriesHue(index, one.hue),
      })
    if (last !== undefined)
      scene.over.push({
        ...label(
          last[0] + 14,
          last[1] + 3,
          one.name,
          "sub",
          "start",
          ...nameClass(one)
        ),
        hue: seriesHue(index, one.hue),
      })
  })
  return scene
}

function bumpLine(one: SeriesWritten, index: number): Paint {
  if (one.focal === true)
    return tinted(null, null, "fill-none", "line-accent", "line-bold")
  return tinted(
    seriesHue(index, one.hue),
    null,
    "fill-none",
    "line-hue",
    "line-bold"
  )
}

export const line: TypeModule = {
  name: "line",
  label: "Un gráfico de líneas",
  keys: ["x", "series", "unit", "decimals"],
  variants: VARIANTS,
  schema,
  read,
}
