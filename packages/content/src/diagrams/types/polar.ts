import { z } from "zod"
import type { Graphic } from "#diagrams/model"
import { optional } from "#diagrams/report"
import { checkBudget } from "#diagrams/types/kit/budget"
import { label, readFormat, shape } from "#diagrams/types/kit/charts"
import { formSchema } from "#diagrams/types/kit/form"
import { datumOf, markIds } from "#diagrams/types/kit/marks"
import {
  emptyScene,
  type Scene,
  type Tools,
  type TypeModule,
} from "#diagrams/types/kit/scene"
import {
  formatFields,
  formatNumber,
  numberSchema,
} from "#diagrams/types/kit/values"
import {
  labelPoint,
  polarPoint,
  sideAnchor,
  spokeAngle,
  wedgePath,
} from "#diagrams/types/layout/polar"
import { niceDomain } from "#diagrams/types/layout/scale"

// Polar chart (diagram-design's `type-polar.md`): one series over 4 to 8
// categories whose clockwise order means something (hours, weekdays,
// months). Each category is a wedge whose radius follows its value from a
// shared zero at the centre; the lollipop variant draws a ray and a dot
// instead, as the reference prefers when wedge areas would mislead.

const CENTRE = { x: 380, y: 210 }
const RADIUS = 140
const RINGS = [0.2, 0.4, 0.6, 0.8, 1]
const LIMITS = [{ max: 8, what: "categorías" }]

const categoriesSchema = z.array(z.string().min(1)).min(4, {
  error: "Un gráfico polar lleva al menos 4 categorías",
})
const valuesSchema = z.array(numberSchema)

function schema() {
  return formSchema("polar", ["lollipop"], {
    categories: categoriesSchema.meta({
      description: "De 4 a 8 categorías, en el sentido de las agujas del reloj",
    }),
    values: valuesSchema.meta({ description: "Un valor por categoría" }),
    max: z.number().positive().optional().meta({
      description: "El tope de la escala; por defecto, uno redondo",
    }),
    focal: z.string().min(1).optional().meta({
      description: "La categoría que va en el color de acento",
    }),
    ...formatFields(),
  })
}

function read(
  data: Record<string, unknown>,
  tools: Tools,
  variant: string | null
): Scene | null {
  const report = tools.report
  const format = readFormat(data, report)
  const categories = optional(
    categoriesSchema,
    data.categories,
    "categories",
    report
  )
  if (data.categories === undefined)
    report("categories", "Falta: es obligatorio")
  const written = optional(valuesSchema, data.values, "values", report)
  if (data.values === undefined) report("values", "Falta: es obligatorio")
  const ownMax = optional(z.number().positive(), data.max, "max", report)
  const focal = optional(z.string().min(1), data.focal, "focal", report)
  if (categories === undefined || written === undefined) return null
  checkBudget("Un gráfico polar", LIMITS, [categories.length], report)
  if (written.length !== categories.length)
    report(
      "values",
      `Hay ${categories.length} categorías y ${written.length} valores: uno por categoría`
    )
  if (focal !== undefined && !categories.includes(focal))
    report("focal", `\`${focal}\` no es ninguna de las categorías`)

  const max = scaleTop(ownMax, written)
  const values = categories.map((_, index) =>
    valueAt(written[index], index, max, tools)
  )
  const scene = emptyScene({ width: CENTRE.x * 2, height: CENTRE.y * 2 + 20 })
  for (const ring of RINGS) {
    scene.under.push(
      shape({ kind: "circle", cx: CENTRE.x, cy: CENTRE.y, r: RADIUS * ring }, [
        "fill-none",
        "line-rule",
      ])
    )
    scene.under.push(
      label(
        CENTRE.x - 6,
        CENTRE.y - RADIUS * ring + 3,
        formatNumber(max * ring, { unit: null, decimals: format.decimals }),
        "tick",
        "end"
      )
    )
  }
  const count = categories.length
  const span = (2 * Math.PI) / count
  const nextId = markIds()
  categories.forEach((category, index) => {
    const angle = spokeAngle(index, count)
    const [sx, sy] = polarPoint(CENTRE.x, CENTRE.y, RADIUS, angle)
    scene.under.push(
      shape({ kind: "line", x1: CENTRE.x, y1: CENTRE.y, x2: sx, y2: sy }, [
        "line-rule",
      ])
    )
    const value = values[index] ?? null
    const printed = printedValue(value, format)
    const [lx, ly] = labelPoint(CENTRE.x, CENTRE.y, RADIUS + 22, angle)
    scene.under.push(label(lx, ly, category, "item", sideAnchor(angle)))
    scene.under.push(
      label(lx, ly + 12, printed, "tick", sideAnchor(angle), ["text-muted"])
    )
    if (value === null || value === 0) return
    const radius = (RADIUS * value) / max
    const isFocal = category === focal
    const datum = datumOf(nextId(), category, null, printed)
    if (variant === "lollipop") {
      scene.over.push(...lollipop(angle, radius, isFocal, datum))
      return
    }
    const classes = wedgeClasses(isFocal)
    scene.over.push(
      shape(
        {
          kind: "path",
          d: wedgePath(
            CENTRE.x,
            CENTRE.y,
            radius,
            angle - span / 2,
            angle + span / 2
          ),
        },
        classes,
        { datum }
      )
    )
  })
  if (focal !== undefined && categories.includes(focal)) scene.accents = 1
  scene.text = [
    {
      kind: "table",
      head: ["Categoría", "Valor"],
      rows: categories.map((category, index) => [
        category,
        printedValue(values[index] ?? null, format),
      ]),
    },
  ]
  return scene
}

function wedgeClasses(focal: boolean): string[] {
  if (focal) return ["fill-accent-tint", "line-accent"]
  return ["fill-soft", "line-muted"]
}

/** A ray from the centre and a dot at its end. */
function lollipop(
  angle: number,
  radius: number,
  focal: boolean,
  datum: ReturnType<typeof datumOf>
): Graphic[] {
  const [x, y] = polarPoint(CENTRE.x, CENTRE.y, radius, angle)
  const line = focal ? "line-accent" : "line-ink"
  const fill = focal ? "fill-accent" : "fill-ink"
  return [
    shape({ kind: "line", x1: CENTRE.x, y1: CENTRE.y, x2: x, y2: y }, [
      line,
      "line-bold",
    ]),
    shape({ kind: "circle", cx: x, cy: y, r: 4 }, [fill], { datum }),
  ]
}

/** The scale's top: the one given, or a round number over the biggest value. */
function scaleTop(own: number | undefined, values: readonly number[]): number {
  if (own !== undefined) return own
  return niceDomain(0, Math.max(0, ...values)).max
}

/** A value between zero and the top of the scale; outside, reported and clamped. */
function valueAt(
  value: number | undefined,
  index: number,
  max: number,
  tools: Tools
): number | null {
  if (value === undefined) return null
  const at = `values.${index}`
  if (value > max) {
    tools.report(
      at,
      `${value} está por encima de max (${max}): se dibuja en ${max}`
    )
    return max
  }
  if (value < 0) {
    tools.report(at, `${value} está por debajo de 0: se dibuja en 0`)
    return 0
  }
  return value
}

function printedValue(
  value: number | null,
  format: { unit: string | null; decimals: number }
): string {
  if (value === null) return "—"
  return formatNumber(value, format)
}

export const polar: TypeModule = {
  name: "polar",
  label: "Un gráfico polar",
  keys: ["categories", "values", "max", "focal", "unit", "decimals"],
  variants: ["lollipop"],
  schema,
  read,
}
