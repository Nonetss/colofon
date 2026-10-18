import { z } from "zod"
import { textWidth } from "#diagrams/measure"
import type { Graphic, LegendEntry } from "#diagrams/model"
import { optional, type Report, salvagedList } from "#diagrams/report"
import { HUES, type Hue } from "#diagrams/schema"
import {
  label,
  matchingSeries,
  type Plot,
  rule,
  type SeriesWritten,
  seriesSchema,
  shape,
  tickWidth,
  tinted,
  valueAxis,
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
  type ValueFormat,
} from "#diagrams/types/kit/values"
import { linearScale, type Scale } from "#diagrams/types/layout/scale"

// Bar chart (diagram-design's `type-bar.md`): one or two series of values
// over categories, the value axis from zero to a round number, one focal
// category in the accent. `variant: "dumbbell"` draws each category as two
// dots joined by a line, along a horizontal value axis.

const ORIENTATIONS = ["vertical", "horizontal"] as const

const LIMITS = [{ max: 12, what: "categorías" }]

const text = z.string().min(1)

function schema() {
  return formSchema("bar", ["dumbbell"], {
    categories: z.array(text).min(1).meta({
      description: "Las categorías, en orden",
    }),
    series: z.array(seriesSchema).min(1).max(2).meta({
      description: "Una o dos series, con un valor por categoría",
    }),
    orientation: z.enum(ORIENTATIONS).optional().meta({
      description: "vertical (por defecto) u horizontal",
    }),
    focal: text.optional().meta({
      description: "La categoría que va en el color de acento",
    }),
    ...formatFields(),
  })
}

const fields = formatFields()

/** What a chart over categories reads: its categories, series and format. */
export type CategoryChart = {
  categories: string[]
  series: SeriesWritten[]
  focal: string | null
  format: ValueFormat
}

/** Reads `categories`, `series` (at most `maxSeries`), `focal` and the format. */
function readCategoryChart(
  data: Record<string, unknown>,
  report: Report,
  maxSeries: number
): CategoryChart | null {
  const categories = optional(
    z.array(text).min(1),
    data.categories,
    "categories",
    report
  )
  if (categories === undefined) {
    if (data.categories === undefined)
      report("categories", "Falta: es una lista con al menos un elemento")
    return null
  }
  const written = salvagedList(
    seriesSchema,
    data.series,
    "series",
    ["name", "values"],
    report
  )
  if (written.length > maxSeries)
    report("series", `Lleva como mucho ${maxSeries} series`)
  const series = matchingSeries(
    written.slice(0, maxSeries),
    categories.length,
    "categoría",
    report
  ).map(({ value }) => value)
  const focal = optional(text, data.focal, "focal", report) ?? null
  if (focal !== null && !categories.includes(focal))
    report("focal", `\`${focal}\` no es ninguna de las categorías`)
  return {
    categories,
    series,
    focal,
    format: {
      unit: optional(fields.unit, data.unit, "unit", report) ?? null,
      decimals:
        optional(fields.decimals, data.decimals, "decimals", report) ?? 0,
    },
  }
}

function read(
  data: Record<string, unknown>,
  tools: Tools,
  variant: string | null
): Scene | null {
  const chart = readCategoryChart(data, tools.report, 2)
  if (chart === null) return null
  checkBudget(
    "Un gráfico de barras",
    LIMITS,
    [chart.categories.length],
    tools.report
  )
  const orientation =
    optional(
      z.enum(ORIENTATIONS),
      data.orientation,
      "orientation",
      tools.report
    ) ?? "vertical"
  let scene: Scene
  if (variant === "dumbbell" && chart.series.length !== 2) {
    tools.report(
      "series",
      "Un gráfico de mancuernas compara dos series: se dibuja como barras"
    )
    scene = barScene(chart, orientation)
  } else if (variant === "dumbbell") scene = dumbbellScene(chart)
  else scene = barScene(chart, orientation)
  scene.accents = accentsOf(chart)
  scene.legend = seriesLegend(chart.series, variant === "dumbbell")
  scene.text = [valueTable(chart)]
  return scene
}

function accentsOf(chart: CategoryChart): number {
  if (chart.focal === null || !chart.categories.includes(chart.focal)) return 0
  return 1
}

/** A legend entry per series when there are two; none for one. */
function seriesLegend(
  series: readonly SeriesWritten[],
  dots: boolean
): LegendEntry[] {
  if (series.length < 2) return []
  return series.map((one, index) => ({
    name: one.name,
    sample: sampleOf(seriesHue(index, one.hue, HUES), dots, index === 0),
    series: one.name,
  }))
}

function sampleOf(
  hue: Hue,
  dots: boolean,
  hollow: boolean
): LegendEntry["sample"] {
  if (dots && hollow)
    return { kind: "dot", classes: ["fill-paper", "line-hue"], hue }
  if (dots) return { kind: "dot", classes: ["fill-hue"], hue }
  return { kind: "swatch", classes: ["fill-hue-tint", "line-hue"], hue }
}

/** The categories with their values, a column per series. */
function valueTable(chart: CategoryChart) {
  return {
    kind: "table" as const,
    head: ["", ...chart.series.map((one) => one.name)],
    rows: chart.categories.map((category, index) => [
      category,
      ...chart.series.map((one) =>
        formatNumber(one.values[index] ?? 0, chart.format)
      ),
    ]),
  }
}

/** Every value of every series. */
function allValues(series: readonly SeriesWritten[]): number[] {
  const values: number[] = []
  for (const one of series) values.push(...one.values)
  return values
}

/** The paint of one bar: the focal category's in the accent. */
function barPaint(
  chart: CategoryChart,
  category: string,
  index: number,
  one: SeriesWritten
) {
  if (category === chart.focal)
    return tinted(null, null, "fill-accent-tint", "line-accent")
  if (chart.series.length === 1 && one.hue === undefined)
    return tinted(null, null, "fill-soft", "line-muted")
  return tinted(
    seriesHue(index, one.hue, HUES),
    null,
    "fill-hue-tint",
    "line-hue"
  )
}

function valueClass(chart: CategoryChart, category: string): string {
  if (category === chart.focal) return "text-accent"
  return "text-muted"
}

const PLOT_SIZE = 240

function barScene(chart: CategoryChart, orientation: string): Scene {
  const values = allValues(chart.series)
  const low = Math.min(0, ...values)
  const high = Math.max(0, ...values)
  if (orientation === "horizontal") return horizontalBars(chart, low, high)
  const slot = Math.max(
    40 + 24 * chart.series.length,
    ...chart.categories.map((category) => textWidth(category, 11, "sans") + 16)
  )
  const probe = linearScale(low, high, 0, 1)
  const left = 24 + tickWidth(probe) + 12
  const top = 32
  const plot: Plot = {
    left,
    top,
    right: left + slot * chart.categories.length,
    bottom: top + PLOT_SIZE,
  }
  const scale = linearScale(low, high, plot.bottom, plot.top)
  const scene = emptyScene({ width: plot.right + 32, height: plot.bottom + 40 })
  scene.under.push(...valueAxis(scale, plot, true))
  const next = markIds()
  const barWidth = Math.min(48, (slot - 24) / chart.series.length)
  const zero = scale.at(0)
  chart.categories.forEach((category, position) => {
    const start =
      plot.left + slot * position + (slot - barWidth * chart.series.length) / 2
    chart.series.forEach((one, index) => {
      const value = one.values[position] ?? 0
      const at = scale.at(value)
      const x = start + barWidth * index
      scene.over.push(
        verticalBar(
          x,
          barWidth,
          zero,
          at,
          barPaint(chart, category, index, one),
          {
            id: next(),
            category,
            one,
            value: formatNumber(value, chart.format),
          }
        )
      )
      const above = value >= 0
      scene.over.push(
        label(
          x + barWidth / 2,
          valueY(above, at),
          formatNumber(value, chart.format),
          "tick",
          "middle",
          valueClass(chart, category)
        )
      )
    })
    scene.over.push(
      label(
        plot.left + slot * position + slot / 2,
        plot.bottom + 20,
        category,
        "item",
        "middle",
        "text-bold"
      )
    )
  })
  return scene
}

function valueY(above: boolean, at: number): number {
  if (above) return at - 6
  return at + 12
}

function verticalBar(
  x: number,
  width: number,
  zero: number,
  at: number,
  look: ReturnType<typeof tinted>,
  mark: { id: string; category: string; one: SeriesWritten; value: string }
): Graphic {
  return shape(
    {
      kind: "rect",
      x,
      y: Math.min(zero, at),
      w: Math.max(1, width - 4),
      h: Math.max(1, Math.abs(zero - at)),
      r: 1,
    },
    {
      ...look,
      datum: datumOf(
        mark.id,
        mark.category,
        mark.one.name,
        mark.value,
        mark.one.info ?? null
      ),
    }
  )
}

/** The left edge of the plot after the widest category label. */
function labelColumn(chart: CategoryChart): number {
  return (
    24 +
    Math.max(
      ...chart.categories.map((category) => textWidth(category, 11, "sans"))
    ) +
    12
  )
}

function horizontalBars(
  chart: CategoryChart,
  low: number,
  high: number
): Scene {
  const row = 16 + 14 * chart.series.length
  const left = labelColumn(chart)
  const plot: Plot = {
    left,
    top: 24,
    right: left + 480,
    bottom: 24 + row * chart.categories.length,
  }
  const scale = linearScale(low, high, plot.left, plot.right)
  const scene = emptyScene({ width: plot.right + 72, height: plot.bottom + 32 })
  scene.under.push(...valueAxis(scale, plot, false))
  const next = markIds()
  const zero = scale.at(0)
  chart.categories.forEach((category, position) => {
    const top = plot.top + row * position + 8
    chart.series.forEach((one, index) => {
      const value = one.values[position] ?? 0
      const at = scale.at(value)
      const y = top + 14 * index
      scene.over.push(
        shape(
          {
            kind: "rect",
            x: Math.min(zero, at),
            y,
            w: Math.max(1, Math.abs(at - zero)),
            h: 12,
            r: 1,
          },
          {
            ...barPaint(chart, category, index, one),
            datum: datumOf(
              next(),
              category,
              one.name,
              formatNumber(value, chart.format),
              one.info ?? null
            ),
          }
        )
      )
      scene.over.push(
        sideLabel(
          value,
          at,
          y + 9,
          formatNumber(value, chart.format),
          chart,
          category
        )
      )
    })
    scene.over.push(
      label(
        plot.left - 12,
        top + (row - 16) / 2 + 4,
        category,
        "item",
        "end",
        "text-bold"
      )
    )
  })
  return scene
}

function sideLabel(
  value: number,
  at: number,
  y: number,
  text: string,
  chart: CategoryChart,
  category: string
): Graphic {
  if (value >= 0)
    return label(at + 6, y, text, "tick", "start", valueClass(chart, category))
  return label(at - 6, y, text, "tick", "end", valueClass(chart, category))
}

/** Each category as two dots on its row, joined by a line, values outside. */
function dumbbellScene(chart: CategoryChart): Scene {
  const left = labelColumn(chart)
  const plot: Plot = {
    left,
    top: 24,
    right: left + 480,
    bottom: 24 + 32 * chart.categories.length,
  }
  const scale: Scale = linearScale(
    Math.min(0, ...allValues(chart.series)),
    Math.max(0, ...allValues(chart.series)),
    plot.left,
    plot.right
  )
  const scene = emptyScene({ width: plot.right + 72, height: plot.bottom + 32 })
  scene.under.push(...valueAxis(scale, plot, false))
  const next = markIds()
  const [first, second] = chart.series
  if (first === undefined || second === undefined) return scene
  chart.categories.forEach((category, position) => {
    const y = plot.top + 32 * position + 16
    const a = first.values[position] ?? 0
    const b = second.values[position] ?? 0
    const xa = scale.at(a)
    const xb = scale.at(b)
    scene.over.push(rule(xa, y, xb, y, connectorClass(chart, category)))
    scene.over.push(
      dot(xa, y, first, 0, category, a, chart, next(), true),
      dot(xb, y, second, 1, category, b, chart, next(), false)
    )
    const lowX = Math.min(xa, xb)
    const highX = Math.max(xa, xb)
    const lowValue = Math.min(a, b)
    const highValue = Math.max(a, b)
    scene.over.push(
      label(
        lowX - 10,
        y + 3,
        formatNumber(lowValue, chart.format),
        "tick",
        "end",
        "text-muted"
      ),
      label(
        highX + 10,
        y + 3,
        formatNumber(highValue, chart.format),
        "tick",
        "start",
        "text-muted"
      ),
      label(plot.left - 12, y + 4, category, "item", "end", "text-bold")
    )
  })
  return scene
}

function connectorClass(chart: CategoryChart, category: string): string {
  if (category === chart.focal) return "line-accent"
  return "line-muted"
}

function dot(
  x: number,
  y: number,
  one: SeriesWritten,
  index: number,
  category: string,
  value: number,
  chart: CategoryChart,
  id: string,
  hollow: boolean
): Graphic {
  const look = dotPaint(
    chart,
    category,
    seriesHue(index, one.hue, HUES),
    hollow
  )
  return shape(
    { kind: "circle", cx: x, cy: y, r: 5 },
    {
      ...look,
      datum: datumOf(
        id,
        category,
        one.name,
        formatNumber(value, chart.format),
        one.info ?? null
      ),
    }
  )
}

function dotPaint(
  chart: CategoryChart,
  category: string,
  hue: Hue,
  hollow: boolean
) {
  if (category === chart.focal && !hollow)
    return tinted(null, null, "fill-accent", "line-paper")
  if (hollow) return tinted(hue, null, "fill-paper", "line-hue")
  return tinted(hue, null, "fill-hue", "line-paper")
}

export const bar: TypeModule = {
  name: "bar",
  label: "Un gráfico de barras",
  keys: ["categories", "series", "orientation", "focal", "unit", "decimals"],
  variants: ["dumbbell"],
  schema,
  read,
}
