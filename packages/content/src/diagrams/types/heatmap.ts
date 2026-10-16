import { z } from "zod"
import { textWidth } from "#pages/diagram-measure"
import { listOf, optional } from "#pages/diagram-read"
import { checkBudget } from "#pages/diagram-types/budget"
import {
  datumOf,
  label,
  markIds,
  readFormat,
  shape,
} from "#pages/diagram-types/chart-kit"
import { formSchema } from "#pages/diagram-types/form"
import {
  emptyScene,
  type Graphic,
  type LegendEntry,
  type Scene,
  type Tools,
  type TypeModule,
} from "#pages/diagram-types/scene"
import {
  formatFields,
  formatNumber,
  numberSchema,
  type ValueFormat,
} from "#pages/diagram-types/values"

// Heatmap (diagram-design's `type-heatmap.md`): a grid of rows × columns,
// each cell shaded by its value on one ink ramp from the smallest to the
// largest value, never invisible against the paper; one focal cell in the
// accent, kept out of the ramp so an outlier does not flatten the rest.

const LIMITS = [
  { max: 12, what: "filas" },
  { max: 12, what: "columnas" },
]

/** The ramp's opacities: the palest still visible, the darkest under the accent. */
export const RAMP = { low: 0.07, high: 0.65 }

/** From this opacity on, a cell's value is printed in the paper colour. */
const DARK = 0.45

const CELL_H = 44
const GAP = 4
const TOP = 40

const names = z.array(z.string().min(1)).min(1)
const cellsSchema = z.array(z.array(z.union([numberSchema, z.null()])))
const focalSchema = z.tuple([z.number().int().min(0), z.number().int().min(0)])

function schema() {
  return formSchema("heatmap", [], {
    rows: names.meta({ description: "El nombre de cada fila" }),
    columns: names.meta({ description: "El nombre de cada columna" }),
    values: cellsSchema.meta({
      description: "Una lista por fila, con un número (o null) por columna",
    }),
    focal: focalSchema.optional().meta({
      description: "[fila, columna] de la celda destacada, desde 0",
    }),
    ...formatFields(),
  })
}

function read(data: Record<string, unknown>, tools: Tools): Scene | null {
  const report = tools.report
  const rows = optional(names, data.rows, "rows", report)
  const columns = optional(names, data.columns, "columns", report)
  if (data.rows === undefined) report("rows", "Falta: es obligatorio")
  if (data.columns === undefined) report("columns", "Falta: es obligatorio")
  if (rows === undefined || columns === undefined) return null
  const format = readFormat(data, report)
  const values = cellValues(data.values, rows, columns, tools)
  checkBudget("Un mapa de calor", LIMITS, [rows.length, columns.length], report)
  const focal = focalCell(data.focal, rows.length, columns.length, tools)

  const ramp = rampOf(values, focal)
  const left = Math.max(
    80,
    Math.ceil(Math.max(...rows.map((row) => textWidth(row, 9, "mono"))) + 32)
  )
  const widest = Math.max(
    ...columns.map((column) => textWidth(column, 9, "mono")),
    ...values.flat().map((value) => valueWidth(value, format))
  )
  const cellW = Math.max(64, Math.ceil(widest + 16))
  const scene = emptyScene({
    width: left + columns.length * (cellW + GAP) + 24,
    height: TOP + rows.length * (CELL_H + GAP) + 12,
  })
  const nextId = markIds()
  columns.forEach((column, c) => {
    scene.under.push(
      label(
        left + c * (cellW + GAP) + cellW / 2,
        TOP - 12,
        column,
        "value",
        "middle",
        ["text-muted"]
      )
    )
  })
  rows.forEach((row, r) => {
    const y = TOP + r * (CELL_H + GAP)
    scene.under.push(
      label(left - 12, y + CELL_H / 2 + 3, row, "value", "end", ["text-muted"])
    )
    columns.forEach((column, c) => {
      const x = left + c * (cellW + GAP)
      const value = values[r]?.[c] ?? null
      const geometry = {
        kind: "rect" as const,
        x,
        y,
        w: cellW,
        h: CELL_H,
        r: 2,
      }
      if (value === null) {
        scene.under.push(
          shape(geometry, ["fill-none", "line-rule", "line-dash"])
        )
        return
      }
      const isFocal = focal !== null && focal[0] === r && focal[1] === c
      const datum = datumOf(
        nextId(),
        `${row} · ${column}`,
        row,
        formatNumber(value, format)
      )
      scene.under.push(shape(geometry, ["fill-paper"]))
      if (isFocal) {
        scene.over.push(
          shape(geometry, ["fill-accent", "line-accent"], {
            opacity: 0.85,
            datum,
          })
        )
        scene.over.push(
          cellText(x, y, cellW, value, format, ["text-paper", "text-bold"])
        )
        return
      }
      const opacity = ramp(value)
      scene.over.push(shape(geometry, ["fill-ink"], { opacity, datum }))
      const color = opacity >= DARK ? "text-paper" : "text-ink"
      scene.over.push(cellText(x, y, cellW, value, format, [color]))
    })
  })
  scene.accents = focal === null ? 0 : 1
  scene.legend = legendOf(values, focal, format)
  scene.text = [
    {
      kind: "table",
      head: ["", ...columns],
      rows: rows.map((row, r) => [
        row,
        ...columns.map((_, c) => cellString(values[r]?.[c] ?? null, format)),
      ]),
    },
  ]
  return scene
}

function valueWidth(value: number | null, format: ValueFormat): number {
  if (value === null) return 0
  return textWidth(formatNumber(value, format), 9, "mono")
}

/** A cell's value as printed; a dash for an empty cell. */
function cellString(value: number | null, format: ValueFormat): string {
  if (value === null) return "—"
  return formatNumber(value, format)
}

/** A cell's value centred in it. */
function cellText(
  x: number,
  y: number,
  w: number,
  value: number,
  format: ValueFormat,
  classes: string[]
): Graphic {
  return label(
    x + w / 2,
    y + CELL_H / 2 + 3,
    cellString(value, format),
    "value",
    "middle",
    classes
  )
}

/**
 * The values, one row per row and one cell per column: a row with another
 * count of cells is reported and padded with empty cells or cut.
 */
function cellValues(
  value: unknown,
  rows: readonly string[],
  columns: readonly string[],
  tools: Tools
): (number | null)[][] {
  const written = listOf(value, "values", tools.report, true)
  if (written.length !== rows.length && written.length > 0)
    tools.report(
      "values",
      `Hay ${rows.length} filas y ${written.length} listas de valores: una por fila`
    )
  return rows.map((row, r) => {
    const cells = optional(
      cellsSchema.element,
      written[r],
      `values.${r}`,
      tools.report
    )
    if (cells === undefined) return columns.map(() => null)
    if (cells.length !== columns.length)
      tools.report(
        `values.${r}`,
        `La fila "${row}" tiene ${cells.length} valores y hay ${columns.length} columnas`
      )
    return columns.map((_, c) => cells[c] ?? null)
  })
}

function focalCell(
  value: unknown,
  rows: number,
  columns: number,
  tools: Tools
): [number, number] | null {
  const focal = optional(focalSchema, value, "focal", tools.report)
  if (focal === undefined) return null
  if (focal[0] >= rows || focal[1] >= columns) {
    tools.report("focal", `[${focal[0]}, ${focal[1]}] no es ninguna celda`)
    return null
  }
  return focal
}

/** The opacity of a value: the ramp from the smallest to the largest, the focal cell aside. */
function rampOf(
  values: readonly (number | null)[][],
  focal: [number, number] | null
): (value: number) => number {
  const ramped: number[] = []
  values.forEach((row, r) => {
    row.forEach((value, c) => {
      if (value === null) return
      if (focal !== null && focal[0] === r && focal[1] === c) return
      ramped.push(value)
    })
  })
  const min = Math.min(...ramped)
  const max = Math.max(...ramped)
  if (ramped.length === 0 || max === min)
    return () => (RAMP.low + RAMP.high) / 2
  return (value) => {
    const share = Math.min(1, Math.max(0, (value - min) / (max - min)))
    return Math.round((RAMP.low + share * (RAMP.high - RAMP.low)) * 100) / 100
  }
}

function legendOf(
  values: readonly (number | null)[][],
  focal: [number, number] | null,
  format: ValueFormat
): LegendEntry[] {
  const all: number[] = []
  values.forEach((row, r) => {
    row.forEach((value, c) => {
      if (value === null) return
      if (focal !== null && focal[0] === r && focal[1] === c) return
      all.push(value)
    })
  })
  const entries: LegendEntry[] = []
  if (all.length > 0) {
    entries.push({
      name: `Menos (${formatNumber(Math.min(...all), format)})`,
      sample: {
        kind: "swatch",
        classes: ["fill-ink"],
        hue: null,
        opacity: RAMP.low,
      },
      series: null,
    })
    entries.push({
      name: `Más (${formatNumber(Math.max(...all), format)})`,
      sample: {
        kind: "swatch",
        classes: ["fill-ink"],
        hue: null,
        opacity: RAMP.high,
      },
      series: null,
    })
  }
  if (focal !== null)
    entries.push({
      name: "Destacada",
      sample: { kind: "swatch", classes: ["fill-accent"], hue: null },
      series: null,
    })
  return entries
}

export const heatmap: TypeModule = {
  name: "heatmap",
  label: "Un mapa de calor",
  keys: ["rows", "columns", "values", "focal", "unit", "decimals"],
  variants: [],
  schema,
  read: (data, tools) => read(data, tools),
}
