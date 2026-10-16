import { z } from "zod"
import { textWidth } from "#pages/diagram-measure"
import type { References } from "#pages/diagram-schema"
import { checkBudget } from "#pages/diagram-types/budget"
import { formSchema, itemList } from "#pages/diagram-types/form"
import { itemFields } from "#pages/diagram-types/items"
import {
  itemDatum,
  itemPaint,
  itemTextClass,
  markIds,
  rectAt,
  textAt,
} from "#pages/diagram-types/layout/shapes"
import {
  emptyScene,
  type Scene,
  type Tools,
  type TypeModule,
} from "#pages/diagram-types/scene"

// Layer stack (diagram-design's `type-layers.md`): full-width bands stacked
// from top to bottom, each with its index on the left, its name, its notes
// on the right and, optionally, the pieces it holds as chips under its
// name. One focal layer in the accent.

const WIDTH = 720
const LEFT = 32
const TOP = 24
const BAND = 64
/** A band with chips is this much taller. */
const CHIP_ROW = 22
const NAME_X = 64

const LIMITS = [
  { max: 7, what: "capas" },
  { max: 6, what: "piezas en una capa" },
]

function layerSchema(references: References) {
  return z.strictObject({
    ...itemFields(references),
    items: z.array(z.string().min(1)).optional().meta({
      description: "Las piezas que tiene, dibujadas como fichas",
    }),
  })
}

const layerItems = layerSchema({})

function schema(references: References) {
  return formSchema("layers", [], {
    layers: z.array(layerSchema(references)).min(1).meta({
      description: "Las capas, de arriba abajo",
    }),
  })
}

/** A chip's width for `label`. */
function chipWidth(label: string): number {
  return Math.ceil(textWidth(label, 8, "mono", 0.06) + 14)
}

function read(data: Record<string, unknown>, tools: Tools): Scene {
  const read = itemList(layerItems, data.layers, "layers", tools)
  const chips = read.map(({ written }) => written.items ?? [])
  checkBudget(
    "Una pila de capas",
    LIMITS,
    [read.length, Math.max(0, ...chips.map((list) => list.length))],
    tools.report
  )

  const scene = emptyScene({ width: 0, height: 0 })
  const nextId = markIds()
  let y = TOP
  read.forEach(({ item }, index) => {
    const pieces = chips[index] ?? []
    const height = pieces.length > 0 ? BAND + CHIP_ROW : BAND
    const { classes, hue } = itemPaint(item, ["fill-surface", "line-rule"])
    scene.under.push({
      ...rectAt(LEFT, y, WIDTH, height, 4, ...classes),
      hue,
      link: item.link,
      datum: itemDatum(nextId(), item, item.sub.join(" · ")),
    })
    const middle = y + BAND / 2 + 4
    scene.over.push(
      textAt(
        LEFT + 16,
        middle,
        String(index + 1).padStart(2, "0"),
        "legend",
        "start",
        "text-muted"
      ),
      {
        ...textAt(
          LEFT + NAME_X,
          middle,
          item.name,
          "name",
          "start",
          itemTextClass(item)
        ),
        hue,
        link: item.link,
      }
    )
    item.sub.forEach((line, row) => {
      scene.over.push(
        textAt(
          LEFT + WIDTH - 16,
          middle + 13 * (row - (item.sub.length - 1) / 2),
          line,
          "sub",
          "end",
          "text-muted"
        )
      )
    })
    let x = LEFT + NAME_X
    for (const piece of pieces) {
      const width = chipWidth(piece)
      scene.over.push(
        rectAt(x, y + BAND - 8, width, 18, 3, "fill-paper", "line-soft"),
        textAt(
          x + width / 2,
          y + BAND + 4,
          piece,
          "label",
          "middle",
          "text-ink"
        )
      )
      x += width + 6
    }
    if (x - 6 > LEFT + WIDTH - 16)
      tools.report(
        item.at,
        `Las piezas de "${item.name}" no caben en el ancho de la capa: deja menos o acórtalas`
      )
    y += height + 6
  })

  scene.size = { width: LEFT * 2 + WIDTH, height: y - 6 + TOP }
  scene.accents = read.filter(({ item }) => item.focal).length
  scene.text = [
    {
      kind: "list",
      ordered: true,
      items: read.map(({ item }, index) => [
        layerLine(item.name, item.sub, chips[index] ?? []),
      ]),
    },
  ]
  return scene
}

function layerLine(
  name: string,
  sub: readonly string[],
  pieces: readonly string[]
): string {
  const parts = [name]
  if (sub.length > 0) parts.push(` (${sub.join(", ")})`)
  if (pieces.length > 0) parts.push(`: ${pieces.join(", ")}`)
  return parts.join("")
}

export const layers: TypeModule = {
  name: "layers",
  label: "Una pila de capas",
  keys: ["layers"],
  variants: [],
  schema,
  read: (data, tools) => read(data, tools),
}
