import { z } from "zod"
import { textWidth } from "#diagrams/measure"
import { listOf, optional } from "#diagrams/report"
import type { References } from "#diagrams/schema"
import { checkBudget } from "#diagrams/types/kit/budget"
import { formSchema, itemList } from "#diagrams/types/kit/form"
import { type Item, itemFields } from "#diagrams/types/kit/items"
import {
  emptyScene,
  type Scene,
  type Tools,
  type TypeModule,
} from "#diagrams/types/kit/scene"
import { markIds, rectAt, textAt } from "#diagrams/types/layout/shapes"

// Matrix (diagram-design's `type-dp-security-matrix.md`): rows by columns —
// components by roles, say — each cell holding one of a few ordered levels
// ("Sin acceso", "Lectura", "Escritura", "Admin"), shaded darker the more it
// allows and named in short; the legend below lists the levels.

const LEFT = 24
const TOP = 24
const CELL_H = 32
const HEAD_H = 36
const MIN_CELL = 84

const LIMITS = [
  { max: 10, what: "filas" },
  { max: 8, what: "columnas" },
]

const text = z.string().min(1)

const levelsSchema = z.array(text).min(2).max(5)
const cellsSchema = z.array(z.array(z.union([z.string(), z.null()])))

function schema(references: References) {
  const item = z.strictObject(itemFields(references))
  return formSchema("matrix", [], {
    rows: z.array(item).min(1).meta({ description: "Las filas" }),
    columns: z.array(item).min(1).meta({ description: "Las columnas" }),
    levels: levelsSchema.meta({
      description: "Los niveles (2 a 5), de menos a más (Sin acceso, Lectura…)",
    }),
    cells: cellsSchema.meta({
      description: "Una lista por fila, con el nivel de cada columna o null",
    }),
  })
}

const items = z.strictObject(itemFields({}))

/** How dark a level's cell is: faint for the least, dark for the most. */
export function levelOpacity(level: number, count: number): number {
  if (count <= 1) return 0.5
  return Math.round((0.1 + (0.62 * level) / (count - 1)) * 100) / 100
}

/** A level's name, cut to fit `room` when it does not. */
function shortName(name: string, room: number): string {
  if (textWidth(name, 8, "mono", 0.06) <= room) return name
  const cut = Math.max(1, Math.floor(room / (8 * 0.68)) - 1)
  return `${name.slice(0, cut)}.`
}

function read(data: Record<string, unknown>, tools: Tools): Scene {
  const rows = itemList(items, data.rows, "rows", tools)
  const columns = itemList(items, data.columns, "columns", tools)
  const levels = optional(levelsSchema, data.levels, "levels", tools.report)
  if (data.levels === undefined) tools.report("levels", "Falta: es obligatorio")
  checkBudget("Una matriz", LIMITS, [rows.length, columns.length], tools.report)
  const known = levels ?? []
  const cells = cellsOf(data.cells, rows.length, columns.length, known, tools)

  const headWidth = Math.ceil(
    Math.max(80, ...rows.map(({ item }) => textWidth(item.name, 11, "sans"))) +
      24
  )
  const cellWidth = Math.ceil(
    Math.max(
      MIN_CELL,
      ...columns.map(({ item }) => textWidth(item.name, 11, "sans") + 16)
    )
  )
  const gridLeft = LEFT + headWidth
  const gridTop = TOP + HEAD_H
  const scene = emptyScene({ width: 0, height: 0 })
  columns.forEach(({ item }, col) => {
    scene.under.push({
      ...textAt(
        gridLeft + cellWidth * col + cellWidth / 2,
        gridTop - 12,
        item.name,
        "item",
        "middle",
        "text-ink"
      ),
      link: item.link,
    })
  })
  const nextId = markIds()
  rows.forEach(({ item }, row) => {
    const y = gridTop + CELL_H * row
    scene.under.push({
      ...textAt(
        gridLeft - 12,
        y + CELL_H / 2 + 4,
        item.name,
        "item",
        "end",
        "text-ink"
      ),
      link: item.link,
    })
    columns.forEach(({ item: column }, col) => {
      const x = gridLeft + cellWidth * col
      const level = cells[row]?.[col] ?? null
      scene.over.push(
        ...cellOf(x, y, cellWidth, item, column, level, known, nextId)
      )
    })
  })

  // The levels, as the legend: a swatch each, shaded as its cells; hovering
  // one lights the cells of that level.
  scene.legend = known.map((name, level) => ({
    name,
    sample: {
      kind: "swatch",
      classes: ["fill-ink"],
      hue: null,
      opacity: levelOpacity(level, known.length),
    },
    series: name,
  }))
  scene.size = {
    width: Math.ceil(
      Math.max(gridLeft + cellWidth * columns.length + LEFT, 480)
    ),
    height: gridTop + CELL_H * rows.length + 8,
  }
  scene.text = [
    {
      kind: "table",
      head: ["", ...columns.map(({ item }) => item.name)],
      rows: rows.map(({ item }, row) => [
        item.name,
        ...columns.map((_, col) => cells[row]?.[col] ?? "—"),
      ]),
    },
  ]
  return scene
}

/** A cell: shaded by its level, with its level's short name; empty for none. */
function cellOf(
  x: number,
  y: number,
  width: number,
  row: Item,
  column: Item,
  level: string | null,
  levels: readonly string[],
  nextId: () => string
) {
  const datum = {
    id: nextId(),
    label: `${row.name} · ${column.name}`,
    series: level,
    value: level ?? "—",
    info: null,
  }
  if (level === null)
    return [
      {
        ...rectAt(x, y, width, CELL_H, 0, "fill-paper", "line-rule"),
        datum,
      },
    ]
  const index = levels.indexOf(level)
  const opacity = levelOpacity(index, levels.length)
  return [
    {
      ...rectAt(x, y, width, CELL_H, 0, "fill-ink", "line-paper"),
      opacity,
      datum,
    },
    textAt(
      x + width / 2,
      y + CELL_H / 2 + 3,
      shortName(level, width - 12),
      "label",
      "middle",
      cellText(opacity)
    ),
  ]
}

function cellText(opacity: number): string {
  if (opacity > 0.45) return "text-paper"
  return "text-ink"
}

/**
 * The level of each cell, one list per row: a row whose length is not the
 * columns' and a level that is not one of `levels` are reported; the cell is
 * left empty.
 */
function cellsOf(
  value: unknown,
  rows: number,
  columns: number,
  levels: readonly string[],
  tools: Tools
): (string | null)[][] {
  const cells: (string | null)[][] = []
  if (value === undefined) {
    tools.report("cells", "Falta: es una lista por fila")
    return cells
  }
  listOf(value, "cells", tools.report, true).forEach((row, index) => {
    const at = `cells.${index}`
    if (!Array.isArray(row)) {
      tools.report(at, "Es una lista: el nivel de cada columna, o null")
      cells.push([])
      return
    }
    if (row.length !== columns)
      tools.report(
        at,
        `La fila tiene ${row.length} celdas y hay ${columns} columnas`
      )
    cells.push(
      row.slice(0, columns).map((cell, col) => {
        if (cell === null) return null
        if (typeof cell === "string" && levels.includes(cell)) return cell
        tools.report(
          `${at}.${col}`,
          `\`${String(cell)}\` no es ninguno de los niveles (${levels.join(", ")})`
        )
        return null
      })
    )
  })
  if (Array.isArray(value) && cells.length !== rows)
    tools.report("cells", `Hay ${cells.length} filas de celdas y ${rows} filas`)
  return cells
}

export const matrix: TypeModule = {
  name: "matrix",
  label: "Una matriz",
  keys: ["rows", "columns", "levels", "cells"],
  variants: [],
  schema,
  read: (data, tools) => read(data, tools),
}
