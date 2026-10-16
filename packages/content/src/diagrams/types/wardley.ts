import { z } from "zod"
import type { LegendEntry, TextPart } from "#diagrams/model"
import { salvagedList } from "#diagrams/report"
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
import { type Box, placeLabels } from "#diagrams/types/layout/labels"
import {
  arrowheadAt,
  circleAt,
  itemDatum,
  lineAt,
  markIds,
  textAt,
} from "#diagrams/types/layout/shapes"
import { percent } from "#diagrams/types/quadrant"

// Wardley map (diagram-design's `type-wardley.md`): the components of a
// value chain placed by how visible they are to the user (top) and how
// evolved they are (left to right, across four stages), with straight
// dependency links and at most two dashed accent arrows for what is moving
// towards commodity.

const WIDTH = 640
const HEIGHT = 400
const LEFT = 104
const TOP = 48
const DOT = 6

/** The evolution stages, each a quarter of the x axis. */
export const STAGES = ["Génesis", "A medida", "Producto", "Commodity"]

const LIMITS = [
  { max: 9, what: "componentes" },
  { max: 12, what: "dependencias" },
  { max: 2, what: "movimientos" },
]

function componentSchema(references: References) {
  return z.strictObject({
    ...itemFields(references),
    visibility: percent.meta({
      description: "De 0 (invisible) a 100 (lo que ve el usuario)",
    }),
    evolution: percent.meta({
      description:
        "De 0 a 100: Génesis, A medida, Producto y Commodity, un cuarto cada uno",
    }),
  })
}

const components = componentSchema({})

const link = z.strictObject({
  from: z.string().meta({ description: "El id del componente que depende" }),
  to: z.string().meta({ description: "El id del componente del que depende" }),
})

const move = z.strictObject({
  id: z.string().meta({ description: "El id del componente que se mueve" }),
  to: percent.meta({ description: "La evolución hacia la que va" }),
})

function schema(references: References) {
  return formSchema("wardley", [], {
    components: z.array(componentSchema(references)).min(1).meta({
      description: "Los componentes, cada uno con id, visibility y evolution",
    }),
    links: z.array(link).optional().meta({
      description: "Las dependencias: from depende de to",
    }),
    moves: z.array(move).optional().meta({
      description: "Hacia dónde evoluciona un componente (dos como mucho)",
    }),
  })
}

/** The stage an evolution from 0 to 100 falls in. */
export function stageOf(evolution: number): string {
  const index = Math.min(3, Math.floor(evolution / 25))
  return STAGES[index] ?? ""
}

function visibilityWords(visibility: number): string {
  if (visibility >= 67) return "visibilidad alta"
  if (visibility >= 34) return "visibilidad media"
  return "visibilidad baja"
}

type Placed = {
  item: Item
  x: number
  y: number
  evolution: number
  visibility: number
}

function read(data: Record<string, unknown>, tools: Tools): Scene {
  const read = itemList(components, data.components, "components", tools, {
    required: ["visibility", "evolution"],
    needsId: true,
  })
  const byId = new Map<string, Placed>()
  const placed: Placed[] = read.map(({ item, written }) => {
    const at = {
      item,
      x: LEFT + (written.evolution / 100) * WIDTH,
      y: TOP + (1 - written.visibility / 100) * HEIGHT,
      evolution: written.evolution,
      visibility: written.visibility,
    }
    if (item.id !== null) byId.set(item.id, at)
    return at
  })
  const links = salvagedList(
    link,
    data.links,
    "links",
    ["from", "to"],
    tools.report,
    false
  ).filter(({ at, value }) => known(byId, value, at, tools))
  const moves = salvagedList(
    move,
    data.moves,
    "moves",
    ["id", "to"],
    tools.report,
    false
  ).filter(({ at, value }) => {
    const from = byId.get(value.id)
    if (from === undefined) {
      tools.report(
        `${at}.id`,
        `\`${value.id}\` no es ninguno de los componentes`
      )
      return false
    }
    if (value.to <= from.evolution) {
      tools.report(
        `${at}.to`,
        "Un componente solo evoluciona hacia commodity: to va a la derecha de su evolution"
      )
      return false
    }
    return true
  })
  checkBudget(
    "Un mapa de Wardley",
    LIMITS,
    [read.length, links.length, moves.length],
    tools.report
  )

  const bottom = TOP + HEIGHT
  const right = LEFT + WIDTH
  const scene = emptyScene({ width: right + 40, height: bottom + 40 })
  scene.under.push(
    lineAt(LEFT, TOP, LEFT, bottom, "line-rule"),
    lineAt(LEFT, bottom, right, bottom, "line-rule"),
    textAt(LEFT - 12, TOP + 4, "VISIBLE", "legend", "end", "text-muted"),
    textAt(LEFT - 12, bottom, "INVISIBLE", "legend", "end", "text-muted")
  )
  STAGES.forEach((stage, index) => {
    const x = LEFT + (index * WIDTH) / 4
    if (index > 0)
      scene.under.push(lineAt(x, TOP, x, bottom, "line-rule", "line-dash"))
    scene.under.push(
      textAt(
        x + WIDTH / 8,
        bottom + 20,
        stage.toUpperCase(),
        "legend",
        "middle",
        "text-muted"
      )
    )
  })

  for (const { value } of links) {
    const from = byId.get(value.from)
    const to = byId.get(value.to)
    if (from === undefined || to === undefined) continue
    const length = Math.hypot(to.x - from.x, to.y - from.y)
    if (length <= 2 * DOT) continue
    const ux = (to.x - from.x) / length
    const uy = (to.y - from.y) / length
    scene.under.push(
      lineAt(
        from.x + ux * DOT,
        from.y + uy * DOT,
        to.x - ux * DOT,
        to.y - uy * DOT,
        "line-muted"
      )
    )
  }
  const moving = new Set(moves.map(({ value }) => value.id))
  for (const { value } of moves) {
    const from = byId.get(value.id)
    if (from === undefined) continue
    const end = LEFT + (value.to / 100) * WIDTH
    scene.under.push(
      lineAt(
        from.x + DOT + 2,
        from.y,
        end - 2,
        from.y,
        "line-accent",
        "line-dash"
      ),
      arrowheadAt([end, from.y], 1, 0, "fill-accent")
    )
  }

  const nextId = markIds()
  const dots: Box[] = placed.map(({ x, y }) => ({
    x: x - DOT,
    y: y - DOT,
    w: 2 * DOT,
    h: 2 * DOT,
  }))
  const spots = placeLabels(
    placed.map(({ item, x, y }) => ({
      text: item.name,
      role: "name" as const,
      spots: [
        { x, y: y - 12, anchor: "middle" as const },
        { x, y: y + 22, anchor: "middle" as const },
        { x: x + 12, y: y + 4, anchor: "start" as const },
        { x: x - 12, y: y + 4, anchor: "end" as const },
      ],
    })),
    dots
  )
  placed.forEach(({ item, x, y, evolution }, index) => {
    const accent = item.focal || (item.id !== null && moving.has(item.id))
    scene.over.push({
      ...circleAt(x, y, DOT, ...dotClasses(accent, item.hue !== null)),
      hue: item.hue,
      link: item.link,
      datum: itemDatum(nextId(), item, stageOf(evolution)),
    })
    const spot = spots[index]
    if (spot === null || spot === undefined) {
      tools.report(
        item.at,
        `La etiqueta de "${item.name}" no cabe sin pisar otra: sepáralo de los demás`
      )
      return
    }
    scene.over.push({
      ...textAt(
        spot.x,
        spot.y,
        item.name,
        "name",
        spot.anchor,
        textClass(accent)
      ),
      link: item.link,
    })
  })

  scene.accents =
    moves.length +
    read.filter(
      ({ item }) => item.focal && (item.id === null || !moving.has(item.id))
    ).length
  scene.legend = legendOf(links.length > 0, moves.length > 0)
  scene.text = textOf(placed, links, moves, byId)
  return scene
}

function known(
  byId: ReadonlyMap<string, Placed>,
  value: { from: string; to: string },
  at: string,
  tools: Tools
): boolean {
  let ok = true
  for (const end of ["from", "to"] as const) {
    if (byId.has(value[end])) continue
    tools.report(
      `${at}.${end}`,
      `\`${value[end]}\` no es ninguno de los componentes`
    )
    ok = false
  }
  return ok
}

function dotClasses(accent: boolean, hued: boolean): string[] {
  if (accent) return ["fill-accent-tint", "line-accent"]
  if (hued) return ["fill-paper", "line-hue"]
  return ["fill-paper", "line-ink"]
}

function textClass(accent: boolean): string {
  if (accent) return "text-accent"
  return "text-ink"
}

function legendOf(links: boolean, moves: boolean): LegendEntry[] {
  const entries: LegendEntry[] = [
    {
      name: "Componente",
      sample: { kind: "dot", classes: ["fill-paper", "line-ink"], hue: null },
      series: null,
    },
  ]
  if (links)
    entries.push({
      name: "Depende de",
      sample: { kind: "line", classes: ["line-muted"], hue: null },
      series: null,
    })
  if (moves)
    entries.push({
      name: "Evoluciona",
      sample: {
        kind: "line",
        classes: ["line-accent", "line-dash"],
        hue: null,
      },
      series: null,
    })
  return entries
}

function textOf(
  placed: readonly Placed[],
  links: readonly { value: { from: string; to: string } }[],
  moves: readonly { value: { id: string; to: number } }[],
  byId: ReadonlyMap<string, Placed>
): Scene["text"] {
  const name = (id: string) => {
    const found = byId.get(id)
    if (found === undefined) return id
    return found.item.name
  }
  const lines: TextPart[][] = placed.map(({ item, evolution, visibility }) => {
    const line = `${item.name}: ${stageOf(evolution)}, ${visibilityWords(visibility)}`
    const going = moves.find(({ value }) => value.id === item.id)
    if (going === undefined) return [line]
    return [`${line}; evoluciona hacia ${stageOf(going.value.to)}`]
  })
  const blocks: Scene["text"] = [{ kind: "list", ordered: false, items: lines }]
  if (links.length > 0)
    blocks.push({
      kind: "list",
      ordered: false,
      items: links.map(({ value }) => [
        `${name(value.from)} depende de ${name(value.to)}`,
      ]),
    })
  return blocks
}

export const wardley: TypeModule = {
  name: "wardley",
  label: "Un mapa de Wardley",
  keys: ["components", "links", "moves"],
  variants: [],
  schema,
  read: (data, tools) => read(data, tools),
}
