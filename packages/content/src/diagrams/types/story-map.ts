import { z } from "zod"
import type { Graphic, LegendEntry, TextTree } from "#diagrams/model"
import type { References } from "#diagrams/schema"
import { checkBudget } from "#diagrams/types/kit/budget"
import {
  checkFits,
  lineShape,
  maskedText,
  rectShape,
  textShape,
} from "#diagrams/types/kit/flow"
import { formSchema, itemList } from "#diagrams/types/kit/form"
import { type Item, itemBox, itemFields } from "#diagrams/types/kit/items"
import {
  emptyScene,
  type Scene,
  type Tools,
  type TypeModule,
} from "#diagrams/types/kit/scene"

// User story map (diagram-design's `type-story-map.md`, after Jeff Patton):
// the backbone of activities left to right, and under it one band per
// release, top to bottom, with each activity's stories stacked in its
// column. The release cut, an accent line under the release it names, is
// the point of the map: what ships first.

const LIMITS = [
  { max: 5, what: "actividades" },
  { max: 3, what: "entregas" },
  { max: 12, what: "historias" },
  { max: 4, what: "historias en una actividad y entrega" },
]

const text = z.string().min(1)

function activitySchema(references: References) {
  return z.strictObject(itemFields(references))
}

function storySchema(references: References) {
  return z.strictObject({
    ...itemFields(references),
    activity: z.string().meta({ description: "El id de su actividad" }),
    release: text.meta({ description: "El nombre de su entrega" }),
  })
}

const activities = activitySchema({})
const stories = storySchema({})

function schema(references: References) {
  return formSchema("story-map", [], {
    activities: z.array(activitySchema(references)).min(1).meta({
      description: "Las actividades, de izquierda a derecha, cada una con id",
    }),
    releases: z.array(text).min(1).meta({
      description: "Los nombres de las entregas, de la primera a la última",
    }),
    stories: z.array(storySchema(references)).meta({
      description: "Las historias, cada una con su actividad y su entrega",
    }),
    cut: text.optional().meta({
      description: "La entrega bajo la que va el corte: lo que sale primero",
    }),
  })
}

const MARGIN = 104
const TOP = 24
const COLUMN = 168
const GUTTER = 16
const BACKBONE = 52
const CARD = 40
const CARD_GAP = 8
const BAND_PAD = 12

type Story = { item: Item; activity: Item; release: string }

function read(data: Record<string, unknown>, tools: Tools): Scene | null {
  const backbone = itemList(activities, data.activities, "activities", tools, {
    needsId: true,
  })
    .map(({ item }) => item)
    .filter((item) => item.id !== null)
  const releases = releasesOf(data.releases, tools)
  const read: Story[] = []
  for (const { item, written } of itemList(
    stories,
    data.stories,
    "stories",
    tools,
    {
      required: ["activity", "release"],
      listRequired: false,
    }
  )) {
    const activity = backbone.find(
      (candidate) => candidate.id === written.activity
    )
    if (activity === undefined) {
      tools.report(
        `${item.at}.activity`,
        `\`${written.activity}\` no es ninguna de las actividades`
      )
      continue
    }
    if (!releases.includes(written.release)) {
      tools.report(
        `${item.at}.release`,
        `\`${written.release}\` no es ninguna de las entregas (${releases.join(", ")})`
      )
      continue
    }
    read.push({ item, activity, release: written.release })
  }
  const cut = cutOf(data.cut, releases, tools)
  const crowded = Math.max(
    0,
    ...releases.flatMap((release) =>
      backbone.map((activity) => cell(read, activity, release).length)
    )
  )
  checkBudget(
    "Un mapa de historias",
    LIMITS,
    [backbone.length, releases.length, read.length, crowded],
    tools.report
  )

  const width = MARGIN + backbone.length * (COLUMN + GUTTER) + 8
  const scene = emptyScene({ width, height: 0 })
  const columnX = (position: number) => MARGIN + position * (COLUMN + GUTTER)
  backbone.forEach((activity, position) => {
    scene.nodes.push(
      itemBox(activity, {
        x: columnX(position),
        y: TOP,
        w: COLUMN,
        h: BACKBONE,
        kind: "store",
        tag: `Actividad ${position + 1}`,
      })
    )
    checkFits(activity.name, "name", COLUMN - 16, activity.at, tools.report)
  })
  const under: Graphic[] = []
  const over: Graphic[] = []
  let y = TOP + BACKBONE + 20
  releases.forEach((release, index) => {
    const tallest = Math.max(
      1,
      ...backbone.map((activity) => cell(read, activity, release).length)
    )
    const height = BAND_PAD * 2 + tallest * (CARD + CARD_GAP) - CARD_GAP
    if (index % 2 === 0)
      under.push(rectShape(8, y, width - 16, height, 4, "fill-soft"))
    under.push(textShape(16, y + 16, release.toUpperCase(), "legend", "start"))
    backbone.forEach((activity, position) => {
      cell(read, activity, release).forEach((story, stack) => {
        scene.nodes.push(
          itemBox(story.item, {
            x: columnX(position),
            y: y + BAND_PAD + stack * (CARD + CARD_GAP),
            w: COLUMN,
            h: CARD,
          })
        )
        checkFits(
          story.item.name,
          "name",
          COLUMN - 16,
          story.item.at,
          tools.report
        )
      })
    })
    y += height
    if (release === cut) {
      over.push(
        lineShape(8, y + 4, width - 8, y + 4, "line-accent", "line-bold"),
        maskedText(
          width - 16,
          y + 7,
          "CORTE DE ENTREGA",
          "label",
          "end",
          "text-accent"
        )
      )
    }
    y += 8
  })
  scene.under = under
  scene.over = over
  scene.size = { width, height: Math.ceil(y + 16) }
  const cutAccent = cut === null ? 0 : 1
  scene.accents =
    cutAccent +
    read.filter((story) => story.item.focal).length +
    backbone.filter((activity) => activity.focal).length
  scene.legend = legendOf(cut !== null)
  scene.text = [{ kind: "tree", items: textOf(backbone, releases, read, cut) }]
  return scene
}

/** The release names, each once. */
function releasesOf(value: unknown, tools: Tools): string[] {
  const parsed = z.array(text).min(1).safeParse(value)
  if (!parsed.success) {
    tools.report("releases", "Es una lista con los nombres de las entregas")
    return []
  }
  const seen = new Set<string>()
  const kept: string[] = []
  parsed.data.forEach((release, index) => {
    if (seen.has(release)) {
      tools.report(`releases.${index}`, `\`${release}\` ya es otra entrega`)
      return
    }
    seen.add(release)
    kept.push(release)
  })
  return kept
}

function cutOf(
  value: unknown,
  releases: readonly string[],
  tools: Tools
): string | null {
  if (value === undefined) return null
  if (typeof value === "string" && releases.includes(value)) return value
  tools.report(
    "cut",
    `\`${String(value)}\` no es ninguna de las entregas (${releases.join(", ")})`
  )
  return null
}

function cell(
  stories: readonly Story[],
  activity: Item,
  release: string
): Story[] {
  return stories.filter(
    (story) => story.activity === activity && story.release === release
  )
}

function textOf(
  backbone: readonly Item[],
  releases: readonly string[],
  stories: readonly Story[],
  cut: string | null
): TextTree[] {
  const tree: TextTree[] = releases.map((release) => ({
    line: [release],
    children: backbone
      .filter((activity) => cell(stories, activity, release).length > 0)
      .map((activity) => ({
        line: [
          { box: activity.id ?? "" },
          `: ${cell(stories, activity, release)
            .map((story) => story.item.name)
            .join(", ")}`,
        ],
        children: [],
      })),
  }))
  if (cut !== null)
    tree.push({ line: [`Corte de entrega tras ${cut}`], children: [] })
  return tree
}

function legendOf(cut: boolean): LegendEntry[] {
  const entries: LegendEntry[] = [
    {
      name: "Actividad",
      sample: { kind: "node", node: "store", shape: null },
      series: null,
    },
    {
      name: "Historia",
      sample: { kind: "node", node: "service", shape: null },
      series: null,
    },
  ]
  if (cut)
    entries.push({
      name: "Corte de entrega",
      sample: {
        kind: "line",
        classes: ["line-accent", "line-bold"],
        hue: null,
      },
      series: null,
    })
  return entries
}

export const storyMap: TypeModule = {
  name: "story-map",
  label: "Un mapa de historias",
  keys: ["activities", "releases", "stories", "cut"],
  variants: [],
  schema,
  read: (data, tools) => read(data, tools),
}
