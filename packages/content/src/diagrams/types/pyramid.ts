import { z } from "zod"
import { textWidth } from "#pages/diagram-measure"
import { optional } from "#pages/diagram-read"
import type { References } from "#pages/diagram-schema"
import { checkBudget } from "#pages/diagram-types/budget"
import { formSchema, itemList } from "#pages/diagram-types/form"
import { type Item, itemFields } from "#pages/diagram-types/items"
import {
  itemDatum,
  itemTextClass,
  markIds,
  polygonOf,
  textAt,
} from "#pages/diagram-types/layout/shapes"
import {
  emptyScene,
  type Scene,
  type Tools,
  type TypeModule,
} from "#pages/diagram-types/scene"
import {
  formatFields,
  formatNumber,
  formatOf,
  formatPercent,
  type ValueFormat,
} from "#pages/diagram-types/values"

// Pyramid and funnel (diagram-design's `type-pyramid.md`): levels stacked as
// trapezoids, narrowing upwards (the rarest on top) or, as a funnel,
// downwards. A funnel whose levels all have a value draws each level as wide
// as its value and prints the drop-off from the level above beside it.

const BASE = 520
const LEVEL = 64
const LEFT = 48
const TOP = 32
/** The narrowest end, as a share of the base, so the apex still holds a name. */
const APEX = 0.3

const LIMITS = [{ max: 6, what: "niveles" }]

function levelSchema(references: References) {
  return z.strictObject({
    ...itemFields(references),
    value: z.number().positive().optional().meta({
      description:
        "Su valor: en un embudo, su ancho y la caída desde el de arriba",
    }),
  })
}

const levels = levelSchema({})

function schema(references: References) {
  return formSchema("pyramid", ["funnel"], {
    levels: z.array(levelSchema(references)).min(1).meta({
      description: "Los niveles, de arriba abajo",
    }),
    ...formatFields(),
  })
}

type Level = { item: Item; value: number | null }

function read(
  data: Record<string, unknown>,
  tools: Tools,
  variant: string | null
): Scene {
  const funnel = variant === "funnel"
  const read = itemList(levels, data.levels, "levels", tools)
  const label = funnel ? "Un embudo" : "Una pirámide"
  checkBudget(label, LIMITS, [read.length], tools.report)
  const fields = formatFields()
  const format = formatOf({
    unit: optional(fields.unit, data.unit, "unit", tools.report),
    decimals: optional(
      fields.decimals,
      data.decimals,
      "decimals",
      tools.report
    ),
  })
  const placed: Level[] = read.map(({ item, written }) => ({
    item,
    value: written.value ?? null,
  }))
  const values = valuesOf(placed, funnel, tools)
  const count = placed.length
  const widths = edgeWidths(count, funnel, values)

  const cx = LEFT + BASE / 2
  const drops = values === null ? 0 : 72
  const scene = emptyScene({
    width: LEFT * 2 + BASE + drops,
    height: TOP + count * LEVEL + 32,
  })
  const nextId = markIds()
  placed.forEach((level, index) => {
    const top = TOP + index * LEVEL
    const bottom = top + LEVEL
    const upper = widthAt(widths, index, BASE)
    const lower = widthAt(widths, index + 1, upper)
    const { classes, hue } = levelPaint(level.item)
    scene.under.push({
      ...polygonOf(
        [
          [cx - upper / 2, top],
          [cx + upper / 2, top],
          [cx + lower / 2, bottom],
          [cx - lower / 2, bottom],
        ],
        ...classes
      ),
      hue,
      link: level.item.link,
      datum: itemDatum(nextId(), level.item, valueText(level.value, format)),
    })
    const lines = subLinesOf(level, format)
    const block = 12 + 13 * lines.length
    const nameY = top + (LEVEL - block) / 2 + 11
    scene.over.push({
      ...textAt(
        cx,
        nameY,
        level.item.name,
        "name",
        "middle",
        itemTextClass(level.item)
      ),
      hue,
      link: level.item.link,
    })
    lines.forEach((line, row) => {
      scene.over.push(
        textAt(cx, nameY + 13 * (row + 1), line, "sub", "middle", "text-muted")
      )
    })
    const room = Math.min(upper, lower) - 16
    const width = textWidth(level.item.name, 12, "sans")
    if (width > room)
      tools.report(
        level.item.at,
        `"${level.item.name}" (${Math.round(width)}px) no cabe en ${Math.round(room)}px: acórtalo`
      )
    const drop = dropOf(values, index)
    if (drop !== null)
      scene.over.push(
        textAt(
          cx + Math.max(upper, lower) / 2 + 14,
          top + LEVEL / 2 + 4,
          formatPercent(drop),
          "value",
          "start",
          "text-muted"
        )
      )
  })

  scene.accents = read.filter(({ item }) => item.focal).length
  scene.text = [
    {
      kind: "list",
      ordered: true,
      items: placed.map((level, index) => [
        textLine(level, format, dropOf(values, index)),
      ]),
    },
  ]
  return scene
}

/** Every level's value when a funnel gives them all, else `null` (reported when only some). */
function valuesOf(
  placed: readonly Level[],
  funnel: boolean,
  tools: Tools
): number[] | null {
  const given: number[] = []
  for (const level of placed) if (level.value !== null) given.push(level.value)
  if (!funnel || given.length === 0) return null
  if (given.length < placed.length) {
    tools.report(
      "levels",
      "Un embudo con valores los lleva en todos sus niveles: así su ancho dice algo"
    )
    return null
  }
  return given
}

/**
 * The width of the top edge of each level and, last, of the bottom edge:
 * straight sides from the apex to the base, or, for a funnel with values,
 * each level as wide as its value.
 */
export function edgeWidths(
  count: number,
  funnel: boolean,
  values: readonly number[] | null
): number[] {
  if (values !== null) {
    const max = Math.max(...values)
    const widths = values.map((value) =>
      Math.max(BASE * APEX, (value / max) * BASE)
    )
    widths.push(widthAt(widths, widths.length - 1, BASE))
    return widths
  }
  const widths: number[] = []
  for (let edge = 0; edge <= count; edge++) {
    const share = edge / Math.max(1, count)
    if (funnel) widths.push(BASE * (1 - (1 - APEX) * share))
    else widths.push(BASE * (APEX + (1 - APEX) * share))
  }
  return widths
}

function widthAt(
  widths: readonly number[],
  index: number,
  fallback: number
): number {
  const width = widths[index]
  if (width === undefined) return fallback
  return width
}

/** A level's fill: the accent's tint when focal, its hue's, or a soft grey; white seams between levels. */
function levelPaint(item: Item): { classes: string[]; hue: Item["hue"] } {
  if (item.focal)
    return { classes: ["fill-accent-tint", "line-paper"], hue: null }
  if (item.hue !== null)
    return { classes: ["fill-hue-tint", "line-paper"], hue: item.hue }
  return { classes: ["fill-soft", "line-paper"], hue: null }
}

/** The change from the level above, for a funnel with values. */
function dropOf(
  values: readonly number[] | null,
  index: number
): number | null {
  if (values === null || index === 0) return null
  const above = values[index - 1]
  const own = values[index]
  if (above === undefined || own === undefined) return null
  return (own - above) / above
}

function valueText(value: number | null, format: ValueFormat): string {
  if (value === null) return ""
  return formatNumber(value, format)
}

function subLinesOf(level: Level, format: ValueFormat): string[] {
  if (level.value === null) return level.item.sub
  return [formatNumber(level.value, format), ...level.item.sub]
}

function textLine(
  level: Level,
  format: ValueFormat,
  drop: number | null
): string {
  const parts = [level.item.name]
  if (level.value !== null) parts.push(`: ${formatNumber(level.value, format)}`)
  if (drop !== null) parts.push(` (${formatPercent(drop)})`)
  return parts.join("")
}

export const pyramid: TypeModule = {
  name: "pyramid",
  label: "Una pirámide",
  keys: ["levels", "unit", "decimals"],
  variants: ["funnel"],
  schema,
  read,
}
