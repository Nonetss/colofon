import { z } from "zod"
import type { Graphic, LegendEntry, TextPart } from "#diagrams/model"
import { salvagedList } from "#diagrams/report"
import type { References } from "#diagrams/schema"
import { checkBudget } from "#diagrams/types/kit/budget"
import { formSchema, itemList } from "#diagrams/types/kit/form"
import { type Item, itemBox, itemFields } from "#diagrams/types/kit/items"
import {
  emptyScene,
  type Scene,
  type Tools,
  type TypeModule,
} from "#diagrams/types/kit/scene"
import {
  checkFits,
  lineShape,
  rectShape,
  roleWidth,
  textShape,
} from "#diagrams/types/layout/flow-draw"

// Kanban (diagram-design's `type-kanban.md`): a snapshot of work in progress
// by state. Columns side by side with their name and card count, the cards
// stacked in order; a blocked card is marked, and a column holding more
// cards than its limit has its count chip in the accent. A board has no
// connectors: it is a census, not a flow.

const LIMITS = [
  { max: 5, what: "columnas" },
  { max: 4, what: "tarjetas en una columna" },
  { max: 12, what: "tarjetas" },
]

const text = z.string().min(1)

function cardSchema(references: References) {
  return z.strictObject({
    ...itemFields(references),
    blocked: z.boolean().optional().meta({
      description: "true: está bloqueada",
    }),
  })
}

function columnSchema(references: References) {
  return z.strictObject({
    name: text.meta({ description: "El estado de la columna" }),
    limit: z.number().int().min(1).optional().meta({
      description: "Su límite de trabajo en curso (WIP)",
    }),
    cards: z.array(cardSchema(references)).meta({
      description: "Sus tarjetas, de arriba abajo",
    }),
  })
}

/** A column as read: its cards are checked one by one. */
const columns = z.strictObject({
  name: text,
  limit: z.number().int().min(1).optional(),
  cards: z.array(z.unknown()),
})

const cards = cardSchema({})

function schema(references: References) {
  return formSchema("kanban", [], {
    columns: z.array(columnSchema(references)).min(1).meta({
      description: "Las columnas, de izquierda a derecha",
    }),
  })
}

const LEFT = 24
const TOP = 24
const COLUMN = 192
const GUTTER = 20
const HEADER = 36
const CARD_GAP = 10

type Card = { item: Item; blocked: boolean }
type Column = { name: string; limit: number | null; cards: Card[] }

function read(data: Record<string, unknown>, tools: Tools): Scene | null {
  const read: Column[] = []
  for (const { at, value } of salvagedList(
    columns,
    data.columns,
    "columns",
    ["name", "cards"],
    tools.report
  )) {
    const kept = itemList(cards, value.cards, `${at}.cards`, tools, {
      listRequired: false,
    }).map(({ item, written }) => ({ item, blocked: written.blocked === true }))
    read.push({ name: value.name, limit: value.limit ?? null, cards: kept })
  }
  const all = read.flatMap((column) => column.cards)
  checkBudget(
    "Un kanban",
    LIMITS,
    [
      read.length,
      Math.max(0, ...read.map((column) => column.cards.length)),
      all.length,
    ],
    tools.report
  )

  const scene = emptyScene({ width: 0, height: 0 })
  const under: Graphic[] = []
  const over: Graphic[] = []
  let bottom = TOP + HEADER
  read.forEach((column, position) => {
    const x = LEFT + position * (COLUMN + GUTTER)
    const crowded = overLimit(column)
    over.push(
      textShape(x + 10, TOP + 20, column.name, "name", "start", "text-ink"),
      ...countChip(column, x + COLUMN - 10, TOP + 10, crowded)
    )
    checkFits(
      column.name,
      "name",
      COLUMN - 20 - roleWidth(countText(column), "label") - 18,
      `columns.${position}.name`,
      tools.report
    )
    let y = TOP + HEADER + 8
    for (const card of column.cards) {
      const h = 48 + 12 * card.item.sub.length
      const box = itemBox(card.item, {
        x: x + 8,
        y,
        w: COLUMN - 16,
        h,
        tag: blockedTag(card),
        kind: cardKind(card),
      })
      scene.nodes.push(box)
      checkFits(card.item.name, "name", COLUMN - 32, card.item.at, tools.report)
      if (card.blocked) over.push(rectShape(x + 8, y, 4, h, 2, "fill-accent"))
      y += h + CARD_GAP
    }
    bottom = Math.max(bottom, y)
  })
  read.forEach((_, position) => {
    const x = LEFT + position * (COLUMN + GUTTER)
    under.push(
      rectShape(x, TOP, COLUMN, bottom - TOP + 4, 6, "fill-soft"),
      lineShape(
        x + 8,
        TOP + HEADER - 4,
        x + COLUMN - 8,
        TOP + HEADER - 4,
        "line-muted"
      )
    )
  })
  scene.under = under
  scene.over = over
  scene.size = {
    width:
      LEFT * 2 + read.length * COLUMN + Math.max(0, read.length - 1) * GUTTER,
    height: Math.ceil(bottom + 20),
  }
  scene.accents =
    all.filter((card) => card.item.focal || card.blocked).length +
    read.filter(overLimit).length
  scene.legend = legendOf(read)
  scene.text = [{ kind: "list", ordered: false, items: read.map(columnLine) }]
  return scene
}

function overLimit(column: Column): boolean {
  return column.limit !== null && column.cards.length > column.limit
}

/** "3 / 2" against its limit, or the bare count of a column without one. */
function countText(column: Column): string {
  if (column.limit === null) return String(column.cards.length)
  return `${column.cards.length} / ${column.limit}`
}

/** The count chip at the column header's right, in the accent when over. */
function countChip(
  column: Column,
  right: number,
  top: number,
  over: boolean
): Graphic[] {
  const label = countText(column)
  const w = roleWidth(label, "label") + 12
  const line = over ? "line-accent" : "line-soft"
  const ink = over ? "text-accent" : "text-muted"
  return [
    rectShape(right - w, top, w, 14, 2, "fill-paper", line),
    textShape(right - w / 2, top + 10, label, "label", "middle", ink),
  ]
}

function blockedTag(card: Card): string | null {
  if (card.blocked) return "Bloqueada"
  return null
}

function cardKind(card: Card): "focal" | "service" {
  if (card.blocked) return "focal"
  return "service"
}

/** "<column> (3 / 2): <card>, <card>". */
function columnLine(column: Column): TextPart[] {
  const names = column.cards.map((card) => {
    if (card.blocked) return `${card.item.name} (bloqueada)`
    return card.item.name
  })
  const over = overLimit(column) ? ", por encima del límite" : ""
  return [`${column.name} (${countText(column)}${over}): ${names.join(", ")}`]
}

function legendOf(read: readonly Column[]): LegendEntry[] {
  const entries: LegendEntry[] = []
  if (read.some((column) => column.cards.some((card) => card.blocked)))
    entries.push({
      name: "Bloqueada",
      sample: { kind: "node", node: "focal", shape: null },
      series: null,
    })
  if (read.some(overLimit))
    entries.push({
      name: "Por encima del límite",
      sample: {
        kind: "swatch",
        classes: ["fill-paper", "line-accent"],
        hue: null,
      },
      series: null,
    })
  if (entries.length === 0) return []
  entries.unshift({
    name: "Tarjeta",
    sample: { kind: "node", node: "service", shape: null },
    series: null,
  })
  return entries
}

export const kanban: TypeModule = {
  name: "kanban",
  label: "Un kanban",
  keys: ["columns"],
  variants: [],
  schema,
  read: (data, tools) => read(data, tools),
}
