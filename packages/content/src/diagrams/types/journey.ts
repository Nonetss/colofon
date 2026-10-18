import { z } from "zod"
import type { Graphic, LegendEntry, Point, TextTree } from "#diagrams/model"
import type { References } from "#diagrams/schema"
import { checkBudget } from "#diagrams/types/kit/budget"
import {
  checkFits,
  lineShape,
  rectShape,
  roleWidth,
  shape,
  textShape,
} from "#diagrams/types/kit/flow"
import { formSchema, itemList } from "#diagrams/types/kit/form"
import { type Item, itemFields } from "#diagrams/types/kit/items"
import { tenth, withDatum, withLink } from "#diagrams/types/kit/marks"
import {
  emptyScene,
  type Scene,
  type Tools,
  type TypeModule,
} from "#diagrams/types/kit/scene"

// User journey (diagram-design's `type-journey.md`): the stages of one
// person's experience as columns, how it feels at each one as a curve
// across five named levels (the load-bearing part of the map), and under
// it what they do, think and touch. The lowest stage below neutral is the
// trough, in the accent, and a stage's pain is a dashed accent tag.

const SENTIMENTS = ["muy-mal", "mal", "neutral", "bien", "muy-bien"] as const

type Sentiment = (typeof SENTIMENTS)[number]

const SENTIMENT_NAMES: Record<Sentiment, string> = {
  "muy-mal": "Muy mal",
  mal: "Mal",
  neutral: "Neutral",
  bien: "Bien",
  "muy-bien": "Muy bien",
}

const LIMITS = [
  { max: 6, what: "etapas" },
  { max: 2, what: "puntos de dolor" },
]

const lines = z.array(z.string().min(1))

function stageSchema(references: References) {
  return z.strictObject({
    ...itemFields(references),
    sentiment: z.enum(SENTIMENTS).meta({
      description: "Cómo se siente: muy-mal, mal, neutral, bien o muy-bien",
    }),
    actions: lines.optional().meta({ description: "Lo que hace" }),
    thoughts: lines.optional().meta({ description: "Lo que piensa" }),
    touchpoints: lines.optional().meta({
      description: "Dónde ocurre: la web, el correo, la app…",
    }),
    pain: z.string().min(1).optional().meta({
      description: "Lo que le duele en esta etapa, como una etiqueta",
    }),
  })
}

const stages = stageSchema({})

type StageWritten = z.infer<typeof stages>

function schema(references: References) {
  return formSchema("journey", [], {
    stages: z.array(stageSchema(references)).min(1).meta({
      description: "Las etapas, de izquierda a derecha, con su sentimiento",
    }),
  })
}

/** The rows of texts under the curve, in order, with their captions. */
const ROWS = [
  ["actions", "HACE", "item"],
  ["thoughts", "PIENSA", "sub"],
  ["touchpoints", "DÓNDE", "sub"],
] as const

const MARGIN = 96
const TOP = 20
const COLUMN = 168
const GUTTER = 16
const HEADER = 44
const LEVEL = 32
const LINE = 14

type Stage = { item: Item; written: StageWritten }

function read(data: Record<string, unknown>, tools: Tools): Scene | null {
  const read: Stage[] = itemList(stages, data.stages, "stages", tools, {
    required: ["sentiment"],
  })
  const pains = read.filter(({ written }) => written.pain !== undefined)
  checkBudget(
    "Un mapa de experiencia",
    LIMITS,
    [read.length, pains.length],
    tools.report
  )

  const width = MARGIN + read.length * (COLUMN + GUTTER) + 8
  const centre = (position: number) =>
    MARGIN + position * (COLUMN + GUTTER) + COLUMN / 2
  const under: Graphic[] = []
  const over: Graphic[] = []
  read.forEach(({ item }, position) => {
    over.push(
      textShape(
        centre(position),
        TOP + 10,
        `ETAPA ${position + 1}`,
        "legend",
        "middle"
      ),
      withLink(
        textShape(
          centre(position),
          TOP + 28,
          item.name,
          "name",
          "middle",
          "text-ink"
        ),
        item.link
      )
    )
    checkFits(item.name, "name", COLUMN - 8, item.at, tools.report)
  })

  // The sentiment band: five hairlines, best on top.
  const bandTop = TOP + HEADER + 12
  const levelY = (sentiment: Sentiment) =>
    bandTop + (SENTIMENTS.length - 1 - SENTIMENTS.indexOf(sentiment)) * LEVEL
  for (const sentiment of SENTIMENTS) {
    const y = levelY(sentiment)
    under.push(
      lineShape(MARGIN - 8, y, width - 8, y, "line-rule"),
      textShape(MARGIN - 14, y + 3, SENTIMENT_NAMES[sentiment], "tick", "end")
    )
  }
  const points: Point[] = read.map(({ written }, position) => [
    centre(position),
    levelY(written.sentiment),
  ])
  const trough = troughOf(read)
  under.push(
    shape(
      { kind: "path", d: curveThrough(points) },
      "fill-none",
      "line-ink",
      "line-bold"
    )
  )
  read.forEach(({ item, written }, position) => {
    const [cx, cy] = points[position] ?? [0, 0]
    const low = position === trough
    const radius = low ? 6 : 4
    const fill = low ? "fill-accent" : "fill-ink"
    over.push(
      withDatum(shape({ kind: "circle", cx, cy, r: radius }, fill), {
        id: `m${position}`,
        label: item.name,
        series: null,
        value: SENTIMENT_NAMES[written.sentiment],
        info: item.info,
      })
    )
  })

  // The rows of texts, each with its caption in the margin.
  let y = bandTop + (SENTIMENTS.length - 1) * LEVEL + 28
  for (const [key, caption, role] of ROWS) {
    if (!read.some(({ written }) => (written[key] ?? []).length > 0)) continue
    const tallest = Math.max(
      ...read.map(({ written }) => (written[key] ?? []).length)
    )
    const painRoom = key === "actions" && pains.length > 0 ? 22 : 0
    under.push(
      lineShape(16, y - 14, width - 8, y - 14, "line-rule"),
      textShape(16, y, caption, "legend", "start")
    )
    read.forEach(({ item, written }, position) => {
      const left = centre(position) - COLUMN / 2 + 4
      const list = written[key] ?? []
      list.forEach((text, index) => {
        over.push(
          textShape(
            left,
            y + index * LINE,
            text,
            role,
            "start",
            textClass(role)
          )
        )
        checkFits(
          text,
          role,
          COLUMN - 8,
          `${item.at}.${key}.${index}`,
          tools.report
        )
      })
      if (key === "actions" && written.pain !== undefined)
        over.push(...painTag(left, y + tallest * LINE - 4, written.pain))
    })
    y += tallest * LINE + painRoom + 20
  }
  if (
    pains.length > 0 &&
    !read.some(({ written }) => (written.actions ?? []).length > 0)
  ) {
    read.forEach(({ written }, position) => {
      if (written.pain === undefined) return
      over.push(
        ...painTag(centre(position) - COLUMN / 2 + 4, y - 4, written.pain)
      )
    })
    y += 22
  }

  const scene = emptyScene({ width, height: Math.ceil(y + 12) })
  scene.under = under
  scene.over = over
  const troughAccent = trough === null ? 0 : 1
  const painAccent = pains.length > 0 ? 1 : 0
  scene.accents =
    troughAccent + painAccent + read.filter(({ item }) => item.focal).length
  scene.legend = legendOf(trough !== null, pains.length > 0)
  scene.text = [{ kind: "tree", items: read.map(stageText) }]
  return scene
}

function textClass(role: "item" | "sub"): string {
  if (role === "item") return "text-ink"
  return "text-muted"
}

/**
 * The trough: the first stage with the lowest sentiment, if it is below
 * neutral; a journey that never dips has none.
 */
function troughOf(read: readonly Stage[]): number | null {
  const neutral = SENTIMENTS.indexOf("neutral")
  let lowest: number | null = null
  let lowestLevel = neutral
  for (let position = 0; position < read.length; position++) {
    const stage = read[position]
    if (stage === undefined) continue
    const level = SENTIMENTS.indexOf(stage.written.sentiment)
    if (level < lowestLevel) {
      lowest = position
      lowestLevel = level
    }
  }
  return lowest
}

/** A smooth curve through `points` (Catmull-Rom as cubic Béziers). */
function curveThrough(points: readonly Point[]): string {
  const [first] = points
  if (first === undefined) return ""
  const parts = [`M${first[0]} ${first[1]}`]
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i]
    const p2 = points[i + 1]
    if (p1 === undefined || p2 === undefined) continue
    const p0 = points[i - 1] ?? p1
    const p3 = points[i + 2] ?? p2
    const c1x = tenth(p1[0] + (p2[0] - p0[0]) / 6)
    const c1y = tenth(p1[1] + (p2[1] - p0[1]) / 6)
    const c2x = tenth(p2[0] - (p3[0] - p1[0]) / 6)
    const c2y = tenth(p2[1] - (p3[1] - p1[1]) / 6)
    parts.push(`C${c1x} ${c1y} ${c2x} ${c2y} ${tenth(p2[0])} ${tenth(p2[1])}`)
  }
  return parts.join(" ")
}

/** A dashed accent tag naming a stage's pain. */
function painTag(left: number, top: number, pain: string): Graphic[] {
  const text = pain.toUpperCase()
  const w = roleWidth(text, "label") + 12
  return [
    rectShape(
      left,
      top,
      w,
      14,
      2,
      "fill-accent-tint",
      "line-accent",
      "line-dash"
    ),
    textShape(left + 6, top + 10, text, "label", "start", "text-accent"),
  ]
}

function stageText({ item, written }: Stage): TextTree {
  const children: TextTree[] = []
  for (const [key, caption] of ROWS) {
    const list = written[key] ?? []
    if (list.length > 0)
      children.push({
        line: [`${caption.toLowerCase()}: ${list.join("; ")}`],
        children: [],
      })
  }
  if (written.pain !== undefined)
    children.push({ line: [`dolor: ${written.pain}`], children: [] })
  return {
    line: [`${item.name}: ${SENTIMENT_NAMES[written.sentiment]}`],
    children,
  }
}

function legendOf(trough: boolean, pain: boolean): LegendEntry[] {
  const entries: LegendEntry[] = [
    {
      name: "Sentimiento",
      sample: { kind: "line", classes: ["line-ink", "line-bold"], hue: null },
      series: null,
    },
  ]
  if (trough)
    entries.push({
      name: "Punto más bajo",
      sample: { kind: "dot", classes: ["fill-accent"], hue: null },
      series: null,
    })
  if (pain)
    entries.push({
      name: "Dolor",
      sample: {
        kind: "swatch",
        classes: ["fill-accent-tint", "line-accent", "line-dash"],
        hue: null,
      },
      series: null,
    })
  return entries
}

export const journey: TypeModule = {
  name: "journey",
  label: "Un mapa de experiencia",
  keys: ["stages"],
  variants: [],
  schema,
  read: (data, tools) => read(data, tools),
}
