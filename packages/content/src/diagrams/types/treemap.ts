import { z } from "zod"
import { textWidth } from "#diagrams/measure"
import type { Datum, Graphic, LegendEntry } from "#diagrams/model"
import { listOf, optional } from "#diagrams/report"
import type { References } from "#diagrams/schema"
import { checkBudget } from "#diagrams/types/kit/budget"
import { label, readFormat, shape } from "#diagrams/types/kit/charts"
import { formSchema, itemList } from "#diagrams/types/kit/form"
import { type Item, itemFields } from "#diagrams/types/kit/items"
import { datumOf, markIds, tenth } from "#diagrams/types/kit/marks"
import {
  emptyScene,
  type Scene,
  type Tools,
  type TypeModule,
} from "#diagrams/types/kit/scene"
import {
  formatFields,
  formatNumber,
  formatPercent,
  numberSchema,
  type ValueFormat,
} from "#diagrams/types/kit/values"
import { type Rect, squarify } from "#diagrams/types/layout/squarify"

// Treemap (diagram-design's `type-treemap.md`): part of a whole by area.
// Squarified rectangles whose areas follow their values, biggest first,
// grouped by `group` inside a framed group; a rank-ordered ink ramp so the
// order survives greyscale, one focal cell in the accent. The marimekko
// variant splits a whole two ways: column widths follow their totals and
// each column is split by its parts.

const PLOT = { x: 24, y: 24, w: 712, h: 360 }

const ITEM_LIMITS = [{ max: 16, what: "partes" }]
const COLUMN_LIMITS = [{ max: 6, what: "columnas" }]
const PART_LIMIT = 5

/** The ink ramp of the non-focal cells, from the biggest to the smallest. */
const RAMP = { high: 0.16, low: 0.04 }

const value = numberSchema.refine((written) => written > 0, {
  error: "Es un número mayor que 0",
})

function itemSchema(references: References) {
  return z.strictObject({
    ...itemFields(references),
    value: value.meta({ description: "Su tamaño: un número mayor que 0" }),
    group: z.string().min(1).optional().meta({
      description: "El grupo en el que va, enmarcado con sus partes",
    }),
  })
}

const items = itemSchema({})

const part = z.strictObject({
  name: z.string().min(1),
  value: value,
  info: z.string().min(1).optional(),
})

const column = z.strictObject({
  name: z.string().min(1),
  parts: z.array(part).min(1),
})

function schema(references: References) {
  return formSchema("treemap", ["marimekko"], {
    items: z.array(itemSchema(references)).min(1).optional().meta({
      description: "Las partes, cada una con value (y group)",
    }),
    columns: z.array(column).min(1).optional().meta({
      description: "Marimekko: las columnas, cada una con sus parts",
    }),
    ...formatFields(),
  })
}

function read(
  data: Record<string, unknown>,
  tools: Tools,
  variant: string | null
): Scene | null {
  const format = readFormat(data, tools.report)
  if (variant === "marimekko") {
    if (data.items !== undefined)
      tools.report("items", "Un marimekko lleva columns, no items")
    return marimekko(data, tools, format)
  }
  if (data.columns !== undefined)
    tools.report("columns", "columns va en un marimekko (variant: marimekko)")
  return squarified(data, tools, format)
}

// ── Treemap ─────────────────────────────────────────────────────────────

type Cell = { item: Item; value: number; group: string | null }

function squarified(
  data: Record<string, unknown>,
  tools: Tools,
  format: ValueFormat
): Scene | null {
  const read = itemList(items, data.items, "items", tools, {
    required: ["value"],
  })
  checkBudget("Un treemap", ITEM_LIMITS, [read.length], tools.report)
  if (read.length === 0) return null
  const cells: Cell[] = read.map(({ item, written }) => ({
    item,
    value: written.value,
    group: written.group ?? null,
  }))
  const total = cells.reduce((sum, cell) => sum + cell.value, 0)
  const groups = groupsOf(cells)
  const ranked = [...cells].sort((a, b) => b.value - a.value)
  const opacity = (cell: Cell) => {
    const rank = ranked.indexOf(cell)
    if (ranked.length === 1) return RAMP.high
    const share = rank / (ranked.length - 1)
    return Math.round((RAMP.high - share * (RAMP.high - RAMP.low)) * 100) / 100
  }

  const scene = emptyScene({
    width: PLOT.x * 2 + PLOT.w,
    height: PLOT.y * 2 + PLOT.h,
  })
  const nextId = markIds()
  const grouped = groups.length > 1 || groups[0]?.name !== null
  const groupRects = squarify(
    groups.map((group) => group.total),
    PLOT
  )
  groups.forEach((group, index) => {
    const outer = groupRects[index]
    if (outer === undefined) return
    let inner: Rect = outer
    if (grouped && group.name !== null) {
      inner = {
        x: outer.x + 4,
        y: outer.y + 20,
        w: outer.w - 8,
        h: outer.h - 24,
      }
      scene.under.push(
        shape({ kind: "rect", ...inset(outer, 1), r: 3 }, [
          "fill-none",
          "line-muted",
        ])
      )
      scene.over.push(
        label(
          outer.x + 10,
          outer.y + 14,
          group.name.toUpperCase(),
          "legend",
          "start",
          [],
          true
        )
      )
    }
    const sorted = [...group.cells].sort((a, b) => b.value - a.value)
    const rects = squarify(
      sorted.map((cell) => cell.value),
      inner
    )
    sorted.forEach((cell, at) => {
      const rect = rects[at]
      if (rect === undefined) return
      const box = inset(rect, 2)
      const datum = datumOf(
        nextId(),
        cell.item.name,
        cell.group,
        `${formatNumber(cell.value, format)} · ${formatPercent(cell.value / total)}`,
        cell.item.info
      )
      scene.under.push(shape({ kind: "rect", ...box, r: 2 }, ["fill-paper"]))
      scene.over.push(cellShape(cell, box, opacity(cell), datum))
      scene.over.push(...cellLabels(box, cell.item.name, datum.value))
    })
  })
  scene.accents = cells.filter((cell) => cell.item.focal).length
  scene.legend = treemapLegend(cells)
  scene.text = [
    {
      kind: "table",
      head: ["Parte", "Valor", "Parte del total"],
      rows: ranked.map((cell) => [
        cell.item.name,
        formatNumber(cell.value, format),
        formatPercent(cell.value / total),
      ]),
    },
  ]
  return scene
}

/** A cell: on the ink ramp, or tinted with the accent when it is focal. */
function cellShape(
  cell: Cell,
  box: Rect,
  opacity: number,
  datum: Datum
): Graphic {
  const geometry = { kind: "rect" as const, ...box, r: 2 }
  if (cell.item.focal)
    return shape(geometry, ["fill-accent-tint", "line-accent"], {
      datum,
      link: cell.item.link,
    })
  return shape(geometry, ["fill-ink", "line-rule"], {
    opacity,
    datum,
    link: cell.item.link,
  })
}

function groupsOf(
  cells: readonly Cell[]
): { name: string | null; total: number; cells: Cell[] }[] {
  const groups: { name: string | null; total: number; cells: Cell[] }[] = []
  for (const cell of cells) {
    const found = groups.find((group) => group.name === cell.group)
    if (found === undefined)
      groups.push({ name: cell.group, total: cell.value, cells: [cell] })
    else {
      found.total += cell.value
      found.cells.push(cell)
    }
  }
  return groups.sort((a, b) => b.total - a.total)
}

function inset(rect: Rect, by: number): Rect {
  return {
    x: tenth(rect.x + by),
    y: tenth(rect.y + by),
    w: Math.max(0, tenth(rect.w - 2 * by)),
    h: Math.max(0, tenth(rect.h - 2 * by)),
  }
}

/**
 * A cell's name and value, top left, when they fit: both, only the name,
 * or nothing for a sliver (its card and the text version still name it).
 */
function cellLabels(box: Rect, name: string, value: string): Graphic[] {
  const room = box.w - 20
  const labels: Graphic[] = []
  if (box.h < 24 || textWidth(name, 12, "sans") > room) return labels
  labels.push(label(box.x + 10, box.y + 20, name, "name", "start"))
  if (box.h >= 40 && textWidth(value, 9, "mono") <= room)
    labels.push(label(box.x + 10, box.y + 34, value, "sub", "start"))
  return labels
}

function treemapLegend(cells: readonly Cell[]): LegendEntry[] {
  const entries: LegendEntry[] = [
    {
      name: "Más contraste, más grande",
      sample: { kind: "swatch", classes: ["fill-muted"], hue: null },
      series: null,
    },
  ]
  const focal = cells.find((cell) => cell.item.focal)
  if (focal !== undefined)
    entries.push({
      name: focal.item.name,
      sample: { kind: "swatch", classes: ["fill-accent"], hue: null },
      series: null,
    })
  return entries
}

// ── Marimekko ───────────────────────────────────────────────────────────

/** The ink opacities of the series, from the biggest overall to the smallest. */
const SERIES_RAMP = [0.16, 0.12, 0.09, 0.06, 0.04]

function marimekko(
  data: Record<string, unknown>,
  tools: Tools,
  format: ValueFormat
): Scene | null {
  const written: z.infer<typeof column>[] = []
  listOf(data.columns, "columns", tools.report, true).forEach(
    (entry, index) => {
      const read = optional(column, entry, `columns.${index}`, tools.report)
      if (read !== undefined) written.push(read)
    }
  )
  checkBudget("Un marimekko", COLUMN_LIMITS, [written.length], tools.report)
  for (const [index, entry] of written.entries())
    if (entry.parts.length > PART_LIMIT)
      tools.report(
        `columns.${index}`,
        `Una columna de un marimekko lleva como mucho ${PART_LIMIT} partes y "${entry.name}" tiene ${entry.parts.length}: pártelo en dos diagramas`
      )
  if (written.length === 0) return null

  const totals = written.map((entry) =>
    entry.parts.reduce((sum, item) => sum + item.value, 0)
  )
  const total = totals.reduce((sum, value) => sum + value, 0)
  const series = seriesOrder(written)
  const gap = 4
  const width = PLOT.w - gap * (written.length - 1)
  const scene = emptyScene({
    width: PLOT.x * 2 + PLOT.w,
    height: PLOT.y + PLOT.h + 44,
  })
  const nextId = markIds()
  let x = PLOT.x
  written.forEach((entry, index) => {
    const columnTotal = totals[index] ?? 0
    const w = tenth((columnTotal / total) * width)
    let y = PLOT.y
    const parts = [...entry.parts].sort(
      (a, b) => series.indexOf(a.name) - series.indexOf(b.name)
    )
    for (const item of parts) {
      const h = tenth((item.value / columnTotal) * PLOT.h)
      const box = { x, y, w, h }
      const share = formatPercent(item.value / columnTotal)
      const datum = datumOf(
        nextId(),
        `${item.name} · ${entry.name}`,
        item.name,
        `${formatNumber(item.value, format)} · ${share}`,
        item.info ?? null
      )
      scene.under.push(shape({ kind: "rect", ...box, r: 0 }, ["fill-paper"]))
      scene.over.push(
        shape({ kind: "rect", ...box, r: 0 }, ["fill-ink", "line-paper"], {
          opacity: seriesOpacity(series.indexOf(item.name)),
          datum,
        })
      )
      scene.over.push(...cellLabels(box, item.name, datum.value))
      y += h
    }
    scene.under.push(
      label(
        x + w / 2,
        PLOT.y + PLOT.h + 18,
        `${entry.name} · ${formatPercent(columnTotal / total)}`,
        "value",
        "middle",
        ["text-muted"]
      )
    )
    x += w + gap
  })
  scene.legend = series.map((name, index) => ({
    name,
    sample: {
      kind: "swatch" as const,
      classes: ["fill-ink"],
      hue: null,
      opacity: seriesOpacity(index),
    },
    series: name,
  }))
  const rows: string[][] = []
  written.forEach((entry, index) => {
    const columnTotal = totals[index] ?? 0
    for (const item of entry.parts)
      rows.push([
        entry.name,
        item.name,
        formatNumber(item.value, format),
        formatPercent(item.value / columnTotal),
      ])
  })
  scene.text = [
    {
      kind: "table",
      head: ["Columna", "Parte", "Valor", "En su columna"],
      rows,
    },
  ]
  return scene
}

/** The parts' names, biggest overall first: the order every column stacks them in. */
function seriesOrder(columns: readonly z.infer<typeof column>[]): string[] {
  const totals = new Map<string, number>()
  for (const entry of columns)
    for (const item of entry.parts)
      totals.set(item.name, (totals.get(item.name) ?? 0) + item.value)
  return [...totals.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name)
}

export const treemap: TypeModule = {
  name: "treemap",
  label: "Un treemap",
  keys: ["items", "columns", "unit", "decimals"],
  variants: ["marimekko"],
  schema,
  read,
}

/** The ink opacity of the `index`-th series of a marimekko. */
function seriesOpacity(index: number): number {
  return SERIES_RAMP[index] ?? 0.04
}
