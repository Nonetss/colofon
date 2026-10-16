import { z } from "zod"
import { fit, textWidth } from "#diagrams/measure"
import type { Graphic, LegendEntry, TextTree } from "#diagrams/model"
import { salvagedList } from "#diagrams/report"
import { HUES, type References } from "#diagrams/schema"
import { checkBudget } from "#diagrams/types/kit/budget"
import { formSchema, oneItem } from "#diagrams/types/kit/form"
import { itemBox, itemFields } from "#diagrams/types/kit/items"
import {
  emptyScene,
  type Scene,
  type Tools,
  type TypeModule,
} from "#diagrams/types/kit/scene"
import {
  arrowheadAt,
  lineAt,
  markIds,
  rectAt,
  textAt,
} from "#diagrams/types/layout/shapes"

// Fishbone (diagram-design's `type-fishbone.md`): one observed effect at the
// head on the right, a spine running into it, and a bone per category at
// 60°, alternating above and below, with its causes as short ticks along
// it. The confirmed root-cause bone is in the accent.

/** Bones attach every 160px along the spine, as the reference lays them. */
const SPACING = 160
/** A bone's far end, 60° off the spine. */
const BONE_DX = -96
const BONE_DY = 168
const TAG_H = 24
const TOP = 32
const TICK = 32

const LIMITS = [
  { max: 5, what: "categorías" },
  { max: 3, what: "causas en una categoría" },
  { max: 18, what: "causas" },
]

const text = z.string().min(1)

const category = z.strictObject({
  name: text.meta({ description: "La categoría" }),
  causes: z.array(text).optional().meta({
    description: "Las causas de esa categoría (tres como mucho)",
  }),
  root: z.boolean().optional().meta({
    description: "true: la causa raíz confirmada, en el color de acento",
  }),
  hue: z.enum(HUES).optional(),
  info: text.optional().meta({
    description: "Lo que dice la tarjeta al pasar por encima",
  }),
})

function schema(references: References) {
  return formSchema("fishbone", [], {
    effect: z.strictObject(itemFields(references)).meta({
      description: "El efecto observado: la cabeza, a la derecha",
    }),
    categories: z.array(category).min(1).meta({
      description: "Las categorías de causas, cada una con sus causas",
    }),
  })
}

const effectSchema = z.strictObject(itemFields({}))

type Category = z.infer<typeof category>

/** Where bone `k` (0 the nearest the head) leaves the spine and ends. */
function boneOf(head: number, cy: number, k: number) {
  const above = k % 2 === 0
  const attach = head - (k + 1) * SPACING
  const sign = above ? -1 : 1
  return {
    above,
    attach,
    farX: attach + BONE_DX,
    farY: cy + sign * BONE_DY,
    sign,
  }
}

/** Where the `j`th of `count` causes sits along a bone, as a share of it. */
function tickShare(j: number, count: number): number {
  return (j + 1) / (count + 1)
}

function read(data: Record<string, unknown>, tools: Tools): Scene | null {
  const effect = oneItem(effectSchema, data.effect, "effect", tools)
  const categories = salvagedList(
    category,
    data.categories,
    "categories",
    ["name"],
    tools.report
  ).map(({ value }) => value)
  const causes = categories.map((entry) => entry.causes ?? [])
  checkBudget(
    "Un diagrama de espina",
    LIMITS,
    [
      categories.length,
      Math.max(0, ...causes.map((list) => list.length)),
      causes.reduce((sum, list) => sum + list.length, 0),
    ],
    tools.report
  )
  if (effect === null) return null

  const cy = TOP + TAG_H + BONE_DY
  // Lay out with the head at 0, then shift so the leftmost text is in view.
  const drawn = drawBones(categories, 0, cy)
  const shift = Math.ceil(32 - drawn.left)
  const head = shift
  const graphics = drawBones(categories, head, cy).graphics
  const item = effect.item
  const w = fit(item.name, item.sub, null, 140)
  const h = 56 + 12 * item.sub.length
  const box = itemBox(
    { ...item, id: effectId(item.id) },
    { x: head, y: cy - h / 2, w, h }
  )
  const tail = head - SPACING * categories.length - 40
  const scene = emptyScene({
    width: head + w + 32,
    height: cy + BONE_DY + TAG_H + TOP,
  })
  scene.under.push(
    lineAt(tail, cy, head - 2, cy, "line-ink"),
    arrowheadAt([head, cy], 1, 0, "fill-ink"),
    ...graphics
  )
  scene.nodes.push(box)

  const roots = categories.filter((entry) => entry.root === true).length
  const effectAccent = item.focal ? 1 : 0
  scene.accents = roots + effectAccent
  scene.legend = legendOf(roots > 0)
  scene.text = textOf(effectId(item.id), categories)
  return scene
}

function effectId(id: string | null): string {
  if (id !== null) return id
  return "_efecto"
}

/** The bones, ticks and texts with the head at `head`, and how far left they reach. */
function drawBones(
  categories: readonly Category[],
  head: number,
  cy: number
): { graphics: Graphic[]; left: number } {
  const graphics: Graphic[] = []
  const tags: Graphic[] = []
  const nextId = markIds()
  let left = head - SPACING * categories.length - 40
  categories.forEach((entry, k) => {
    const bone = boneOf(head, cy, k)
    const root = entry.root === true
    const hue = entry.hue ?? null
    graphics.push({
      ...lineAt(
        bone.attach,
        cy,
        bone.farX,
        bone.farY,
        ...boneLine(root, hue !== null)
      ),
      hue,
    })
    const causes = entry.causes ?? []
    causes.forEach((cause, j) => {
      const share = tickShare(j, causes.length)
      const tx = bone.attach + BONE_DX * share
      const ty = cy + bone.sign * BONE_DY * share
      graphics.push(
        lineAt(tx, ty, tx - TICK, ty, "line-soft"),
        textAt(tx - TICK - 4, ty + 3, cause, "sub", "end", "text-muted")
      )
      left = Math.min(left, tx - TICK - 4 - textWidth(cause, 9, "mono"))
    })
    const width = Math.ceil(textWidth(entry.name, 12, "sans") + 20)
    const tagY = bone.above ? bone.farY - TAG_H : bone.farY
    tags.push(
      {
        ...rectAt(
          bone.farX - width / 2,
          tagY,
          width,
          TAG_H,
          4,
          ...tagClasses(root, hue !== null)
        ),
        hue,
        datum: {
          id: nextId(),
          label: entry.name,
          series: null,
          value: causesCount(causes.length),
          info: entry.info ?? null,
        },
      },
      {
        ...textAt(
          bone.farX,
          tagY + 16,
          entry.name,
          "name",
          "middle",
          tagText(root, hue !== null)
        ),
        hue,
      }
    )
    left = Math.min(left, bone.farX - width / 2)
  })
  return { graphics: [...graphics, ...tags], left }
}

function boneLine(root: boolean, hued: boolean): string[] {
  if (root) return ["line-accent", "line-bold"]
  if (hued) return ["line-hue"]
  return ["line-muted"]
}

function tagClasses(root: boolean, hued: boolean): string[] {
  if (root) return ["fill-accent-tint", "line-accent"]
  if (hued) return ["fill-hue-tint", "line-hue"]
  return ["fill-surface", "line-muted"]
}

function tagText(root: boolean, hued: boolean): string {
  if (root) return "text-accent"
  if (hued) return "text-hue"
  return "text-ink"
}

function causesCount(count: number): string {
  if (count === 1) return "1 causa"
  return `${count} causas`
}

function legendOf(root: boolean): LegendEntry[] {
  if (!root) return []
  return [
    {
      name: "Causa raíz",
      sample: {
        kind: "line",
        classes: ["line-accent", "line-bold"],
        hue: null,
      },
      series: null,
    },
  ]
}

function textOf(
  effect: string,
  categories: readonly Category[]
): Scene["text"] {
  const items: TextTree[] = categories.map((entry) => ({
    line: [rootName(entry)],
    children: (entry.causes ?? []).map((cause) => ({
      line: [cause],
      children: [],
    })),
  }))
  return [
    { kind: "list", ordered: false, items: [["Efecto: ", { box: effect }]] },
    { kind: "tree", items },
  ]
}

function rootName(entry: Category): string {
  if (entry.root === true) return `${entry.name} (causa raíz)`
  return entry.name
}

export const fishbone: TypeModule = {
  name: "fishbone",
  label: "Un diagrama de espina",
  keys: ["effect", "categories"],
  variants: [],
  schema,
  read: (data, tools) => read(data, tools),
}
