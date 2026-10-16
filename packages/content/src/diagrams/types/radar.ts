import { z } from "zod"
import type { Point } from "#diagrams/model"
import { listOf, optional, positive } from "#diagrams/report"
import { HUES } from "#diagrams/schema"
import { checkBudget } from "#diagrams/types/kit/budget"
import {
  datumOf,
  label,
  markIds,
  readFormat,
  seriesHue,
  shape,
} from "#diagrams/types/kit/chart-kit"
import { formSchema } from "#diagrams/types/kit/form"
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
  type ValueFormat,
} from "#diagrams/types/kit/values"
import {
  labelPoint,
  polarPoint,
  sideAnchor,
  spokeAngle,
} from "#diagrams/types/layout/polar"

// Radar (diagram-design's `type-radar.md`): a few entities compared across
// a few criteria on one scale from zero to `max`. Five rings, spokes from the
// top clockwise, the scale printed on the top spoke only; each series a
// translucent polygon, the focal one in the accent with its vertices dotted.

export const CENTRE = { x: 380, y: 210 }
export const RADIUS = 140
const RINGS = [0.2, 0.4, 0.6, 0.8, 1]
const LIMITS = [
  { max: 6, what: "ejes" },
  { max: 5, what: "series" },
]

const series = z.strictObject({
  name: z.string().min(1),
  values: z.array(numberSchema),
  hue: z.enum(HUES).optional(),
  focal: z.boolean().optional(),
  info: z.string().min(1).optional(),
})

const axesSchema = z.array(z.string().min(1)).min(3, {
  error: "Un radar lleva al menos 3 ejes",
})

function schema() {
  return formSchema("radar", [], {
    axes: axesSchema.meta({ description: "Los criterios, de 3 a 6" }),
    max: z.number().positive().meta({ description: "El tope de la escala" }),
    series: z.array(series).min(1).meta({
      description: "Las entidades, de 1 a 5: un valor por eje",
    }),
    ...formatFields(),
  })
}

type Series = z.infer<typeof series>

function read(data: Record<string, unknown>, tools: Tools): Scene | null {
  const report = tools.report
  const format = readFormat(data, report)
  const axes = optional(axesSchema, data.axes, "axes", report)
  if (data.axes === undefined) report("axes", "Falta: es obligatorio")
  const max = positive(data.max, "max", report)
  const written: { index: number; value: Series }[] = []
  listOf(data.series, "series", report, true).forEach((entry, index) => {
    const read = optional(series, entry, `series.${index}`, report)
    if (read !== undefined) written.push({ index, value: read })
  })
  if (axes === undefined || max === null) return null
  checkBudget("Un radar", LIMITS, [axes.length, written.length], report)

  const scene = emptyScene({ width: CENTRE.x * 2, height: CENTRE.y * 2 + 20 })
  const angles = axes.map((_, index) => spokeAngle(index, axes.length))
  for (const ring of RINGS) {
    const points = angles.map((angle) =>
      polarPoint(CENTRE.x, CENTRE.y, RADIUS * ring, angle)
    )
    scene.under.push(
      shape({ kind: "polygon", points }, ["fill-none", "line-rule"])
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
  axes.forEach((axis, index) => {
    const angle = angles[index] ?? 0
    const [x, y] = polarPoint(CENTRE.x, CENTRE.y, RADIUS, angle)
    scene.under.push(
      shape({ kind: "line", x1: CENTRE.x, y1: CENTRE.y, x2: x, y2: y }, [
        "line-rule",
      ])
    )
    const [lx, ly] = labelPoint(CENTRE.x, CENTRE.y, RADIUS + 22, angle)
    scene.under.push(label(lx, ly, axis, "item", sideAnchor(angle)))
  })

  const nextId = markIds()
  const drawn = written
    .map(({ index, value }) => ({
      index,
      value,
      values: clamped(value, index, axes, max, tools),
    }))
    .filter((entry) => entry.values !== null)
  // Non-focal series first, the biggest area at the back; the focal one last.
  const ordered = [...drawn].sort((a, b) => {
    if (a.value.focal === true && b.value.focal !== true) return 1
    if (b.value.focal === true && a.value.focal !== true) return -1
    return area(b.values ?? []) - area(a.values ?? [])
  })
  for (const { index, value, values } of ordered) {
    if (values === null) continue
    const points = values.map((v, axis) =>
      polarPoint(CENTRE.x, CENTRE.y, (RADIUS * v) / max, angles[axis] ?? 0)
    )
    const datum = datumOf(
      nextId(),
      value.name,
      value.name,
      summary(axes, value.values, format),
      value.info ?? null
    )
    if (value.focal === true) {
      scene.over.push(
        shape(
          { kind: "polygon", points },
          ["fill-accent", "line-accent", "line-bold"],
          {
            opacity: 0.18,
            datum,
          }
        )
      )
      values.forEach((v, axis) => {
        const point = points[axis]
        if (point === undefined) return
        const [cx, cy] = point
        scene.over.push(
          shape({ kind: "circle", cx, cy, r: 4 }, ["fill-accent"], {
            datum: datumOf(
              nextId(),
              `${value.name} · ${axes[axis] ?? ""}`,
              value.name,
              formatNumber(v, format)
            ),
          })
        )
      })
      continue
    }
    scene.over.push(
      shape({ kind: "polygon", points }, ["fill-hue", "line-hue"], {
        hue: seriesHue(value.hue, index),
        opacity: 0.18,
        datum,
      })
    )
  }
  scene.accents = written.filter(({ value }) => value.focal === true).length
  scene.legend = written.map(({ index, value }) => {
    if (value.focal === true)
      return {
        name: value.name,
        sample: {
          kind: "swatch" as const,
          classes: ["fill-accent"],
          hue: null,
        },
        series: value.name,
      }
    return {
      name: value.name,
      sample: {
        kind: "swatch" as const,
        classes: ["fill-hue"],
        hue: seriesHue(value.hue, index),
      },
      series: value.name,
    }
  })
  scene.text = [
    {
      kind: "table",
      head: ["", ...axes],
      rows: written.map(({ value }) => [
        value.name,
        ...axes.map((_, axis) => cellOf(value.values[axis], format)),
      ]),
    },
  ]
  return scene
}

/**
 * A series' values, one per axis, each between zero and `max`: a value
 * outside is reported and drawn at the edge; a series with another count of
 * values is reported and left out.
 */
function clamped(
  value: Series,
  index: number,
  axes: readonly string[],
  max: number,
  tools: Tools
): number[] | null {
  if (value.values.length !== axes.length) {
    tools.report(
      `series.${index}.values`,
      `"${value.name}" tiene ${value.values.length} valores y hay ${axes.length} ejes`
    )
    return null
  }
  return value.values.map((v, axis) => {
    const at = `series.${index}.values.${axis}`
    if (v > max) {
      tools.report(
        at,
        `${v} está por encima de max (${max}): se dibuja en ${max}`
      )
      return max
    }
    if (v < 0) {
      tools.report(at, `${v} está por debajo de 0: se dibuja en 0`)
      return 0
    }
    return v
  })
}

/** The area of the polygon of `values` (in scale units), to draw big ones first. */
function area(values: readonly number[]): number {
  const points: Point[] = values.map((v, index) =>
    polarPoint(0, 0, v, spokeAngle(index, values.length))
  )
  let sum = 0
  points.forEach(([x, y], index) => {
    const [nx, ny] = points[(index + 1) % points.length] ?? [0, 0]
    sum += x * ny - nx * y
  })
  return Math.abs(sum) / 2
}

function summary(
  axes: readonly string[],
  values: readonly number[],
  format: ValueFormat
): string {
  return axes
    .map((axis, index) => `${axis} ${cellOf(values[index], format)}`)
    .join(" · ")
}

function cellOf(value: number | undefined, format: ValueFormat): string {
  if (value === undefined) return "—"
  return formatNumber(value, format)
}

export const radar: TypeModule = {
  name: "radar",
  label: "Un radar",
  keys: ["axes", "max", "series", "unit", "decimals"],
  variants: [],
  schema,
  read: (data, tools) => read(data, tools),
}
