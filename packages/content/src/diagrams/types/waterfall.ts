import { z } from "zod"
import { textWidth } from "#diagrams/measure"
import type { LegendEntry, Paint } from "#diagrams/model"
import { optional, salvaged, salvagedList } from "#diagrams/report"
import {
  label,
  type Plot,
  rule,
  shape,
  signed,
  tickWidth,
  tinted,
  valueAxis,
} from "#diagrams/types/kit/axes"
import { checkBudget } from "#diagrams/types/kit/budget"
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
  type ValueFormat,
} from "#diagrams/types/kit/values"
import { linearScale } from "#diagrams/types/layout/scale"

// Waterfall (diagram-design's `type-waterfall.md`): a start total, signed
// steps floating from the running total, and the end total the platform
// computes. Totals stand on the baseline; rises and falls are told apart;
// a dashed carry joins each bar to the next at the running total.

const LIMITS = [{ max: 10, what: "pasos" }]

const text = z.string().min(1)

const startSchema = z.strictObject({
  name: text.meta({ description: "El nombre del total de partida" }),
  value: numberSchema.meta({ description: "Su valor" }),
  info: text.optional(),
})

const stepSchema = z.strictObject({
  name: text.meta({ description: "Lo que cambia" }),
  delta: numberSchema.meta({ description: "Cuánto suma (o resta, negativo)" }),
  focal: z.boolean().optional().meta({
    description: "true: va en el color de acento",
  }),
  info: text.optional(),
})

function schema() {
  return formSchema("waterfall", [], {
    start: startSchema,
    steps: z.array(stepSchema).min(1).meta({
      description: "Los cambios, en orden",
    }),
    end: text.optional().meta({
      description: 'El nombre del total final ("Total" por defecto)',
    }),
    ...formatFields(),
  })
}

const fields = formatFields()

type Bar = {
  name: string
  /** Where the bar starts and ends on the value axis. */
  from: number
  to: number
  kind: "total" | "rise" | "fall"
  focal: boolean
  /** Its label: the total, or the signed change. */
  text: string
  info: string | null
}

const PAINTS: Record<Bar["kind"], Paint> = {
  total: tinted(null, null, "fill-soft", "line-ink"),
  rise: tinted("green", null, "fill-hue-tint", "line-hue"),
  fall: tinted("rose", null, "fill-hue-tint", "line-hue"),
}

const NAMES: Record<Bar["kind"], string> = {
  total: "Total",
  rise: "Sube",
  fall: "Baja",
}

function barPaint(bar: Bar): Paint {
  if (bar.focal) return tinted(null, null, "fill-accent-tint", "line-accent")
  return PAINTS[bar.kind]
}

function read(data: Record<string, unknown>, tools: Tools): Scene | null {
  const { report } = tools
  if (data.start === undefined) {
    report("start", "Falta: es obligatorio")
    return null
  }
  const start = salvaged(
    startSchema,
    data.start,
    "start",
    ["name", "value"],
    report
  )
  if (start === null) return null
  const steps = salvagedList(
    stepSchema,
    data.steps,
    "steps",
    ["name", "delta"],
    report
  )
  checkBudget("Un gráfico en cascada", LIMITS, [steps.length], report)
  const format: ValueFormat = {
    unit: optional(fields.unit, data.unit, "unit", report) ?? null,
    decimals: optional(fields.decimals, data.decimals, "decimals", report) ?? 0,
  }
  const endName = optional(text, data.end, "end", report) ?? "Total"

  const bars: Bar[] = [
    {
      name: start.name,
      from: 0,
      to: start.value,
      kind: "total",
      focal: false,
      text: formatNumber(start.value, format),
      info: start.info ?? null,
    },
  ]
  const running: number[] = [start.value]
  let total = start.value
  for (const { value: step } of steps) {
    const before = total
    total += step.delta
    running.push(total)
    bars.push({
      name: step.name,
      from: before,
      to: total,
      kind: stepKind(step.delta),
      focal: step.focal === true,
      text: signed(step.delta, format),
      info: step.info ?? null,
    })
  }
  bars.push({
    name: endName,
    from: 0,
    to: total,
    kind: "total",
    focal: false,
    text: formatNumber(total, format),
    info: null,
  })

  const levels = bars.flatMap((bar) => [bar.from, bar.to])
  const probe = linearScale(Math.min(...levels), Math.max(...levels), 0, 1)
  const slot = Math.max(
    64,
    ...bars.map((bar) => textWidth(bar.name, 11, "sans") + 16)
  )
  const left = 24 + tickWidth(probe) + 12
  const plot: Plot = {
    left,
    top: 32,
    right: left + slot * bars.length,
    bottom: 32 + 240,
  }
  const scale = linearScale(
    Math.min(...levels),
    Math.max(...levels),
    plot.bottom,
    plot.top
  )
  const scene = emptyScene({ width: plot.right + 32, height: plot.bottom + 40 })
  scene.under.push(...valueAxis(scale, plot, true))
  const next = markIds()
  const width = Math.min(48, slot - 20)
  bars.forEach((bar, index) => {
    const x = plot.left + slot * index + (slot - width) / 2
    const top = scale.at(Math.max(bar.from, bar.to))
    const bottom = scale.at(Math.min(bar.from, bar.to))
    scene.over.push(
      shape(
        {
          kind: "rect",
          x,
          y: top,
          w: width,
          h: Math.max(1, bottom - top),
          r: 1,
        },
        {
          ...barPaint(bar),
          datum: datumOf(next(), bar.name, null, bar.text, bar.info),
        }
      )
    )
    const labelClass = bar.focal ? "text-accent" : "text-muted"
    if (bar.kind === "fall")
      scene.over.push(
        label(
          x + width / 2,
          bottom + 12,
          bar.text,
          "tick",
          "middle",
          labelClass
        )
      )
    else
      scene.over.push(
        label(x + width / 2, top - 6, bar.text, "tick", "middle", labelClass)
      )
    scene.over.push(
      label(
        plot.left + slot * index + slot / 2,
        plot.bottom + 20,
        bar.name,
        "item",
        "middle",
        "text-bold"
      )
    )
    const carry = bars[index + 1]
    if (carry === undefined) return
    const level = scale.at(bar.to)
    scene.under.push(
      rule(x + width, level, x + slot, level, "line-soft", "line-dash")
    )
  })
  scene.accents = bars.filter((bar) => bar.focal).length
  scene.legend = legendOf(bars)
  scene.text = [
    {
      kind: "table",
      head: ["", "Cambio", "Acumulado"],
      rows: bars.map((bar, index) => [
        bar.name,
        changeText(bar),
        formatNumber(runningAt(running, index, total), format),
      ]),
    },
  ]
  return scene
}

function stepKind(delta: number): Bar["kind"] {
  if (delta < 0) return "fall"
  return "rise"
}

function changeText(bar: Bar): string {
  if (bar.kind === "total") return ""
  return bar.text
}

/** The running total after bar `index`; the end bar's is the total. */
function runningAt(running: readonly number[], index: number, total: number) {
  const value = running[index]
  if (value === undefined) return total
  return value
}

function legendOf(bars: readonly Bar[]): LegendEntry[] {
  const kinds = new Set(bars.map((bar) => bar.kind))
  const entries: LegendEntry[] = []
  for (const kind of ["total", "rise", "fall"] as const) {
    if (!kinds.has(kind)) continue
    const look = PAINTS[kind]
    entries.push({
      name: NAMES[kind],
      sample: { kind: "swatch", classes: look.classes, hue: look.hue },
      series: null,
    })
  }
  return entries
}

export const waterfall: TypeModule = {
  name: "waterfall",
  label: "Un gráfico en cascada",
  keys: ["start", "steps", "end", "unit", "decimals"],
  variants: [],
  schema,
  read: (data, tools) => read(data, tools),
}
