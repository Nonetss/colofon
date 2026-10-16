import { z } from "zod"
import { textWidth } from "#pages/diagram-measure"
import type { Report } from "#pages/diagram-read"
import { type Anchor, HUES, type Hue } from "#pages/diagram-schema"
import type { Scale } from "#pages/diagram-types/layout/scale"
import {
  type Datum,
  type Graphic,
  type GraphicShape,
  type Paint,
  paint,
  type TextRole,
} from "#pages/diagram-types/scene"
import {
  formatDate,
  formatNumber,
  numberSchema,
  parseDate,
  type ValueFormat,
} from "#pages/diagram-types/values"

// What the chart forms share (bar, waterfall, line, scatter and the forms
// of `chart-more.ts`): series and their hues, data marks with the identity
// the reader's card shows, and the value axis (faint gridlines on round
// ticks, a baseline at zero and the tick labels), after diagram-design's
// bar chart frame.

/** The schema of a series: a name, one value per category, a hue. */
export const seriesSchema = z.strictObject({
  name: z.string().min(1).meta({ description: "El nombre de la serie" }),
  values: z.array(numberSchema).meta({
    description: "Un valor por categoría, en orden",
  }),
  hue: z.enum(HUES).optional().meta({ description: "Su color" }),
  focal: z.boolean().optional().meta({
    description: "true: va en el color de acento",
  }),
  info: z.string().min(1).optional().meta({
    description: "Lo que dice la tarjeta al pasar por encima",
  }),
})

export type SeriesWritten = z.infer<typeof seriesSchema>

/** The hue of the series at `index`: its own, or the next of HUES. */
export function seriesHue(index: number, own: Hue | undefined): Hue {
  if (own !== undefined) return own
  return HUES[index % HUES.length] ?? "blue"
}

/** Numbers the data marks of one drawing: `m0`, `m1`… */
export function markIds(): () => string {
  let next = 0
  return () => {
    const id = `m${next}`
    next += 1
    return id
  }
}

/** A data mark's identity. */
export function datum(
  id: string,
  label: string,
  series: string | null,
  value: string,
  info: string | null = null
): Datum {
  return { id, label, series, value, info }
}

/** A shape with `paint`. */
export function shape(geometry: GraphicShape, look: Paint): Graphic {
  return { ...geometry, ...look }
}

/** A paint tinted by `hue`, with an opacity. */
export function tinted(
  hue: Hue | null,
  opacity: number | null,
  ...classes: string[]
): Paint {
  return { ...paint(...classes), hue, opacity }
}

/** A plain text in `role`, painted by `classes`. */
export function label(
  x: number,
  y: number,
  text: string,
  role: TextRole,
  anchor: Anchor,
  ...classes: string[]
): Graphic {
  return {
    kind: "text",
    x,
    y,
    text,
    role,
    anchor,
    mask: false,
    ...paint(...classes),
  }
}

/** A text in `role` on an opaque paper mask, painted by `classes`. */
export function maskedLabel(
  x: number,
  y: number,
  text: string,
  role: TextRole,
  anchor: Anchor,
  ...classes: string[]
): Graphic {
  return {
    kind: "text",
    x,
    y,
    text,
    role,
    anchor,
    mask: true,
    ...paint(...classes),
  }
}

/** A straight line painted by `classes`. */
export function rule(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  ...classes: string[]
): Graphic {
  return { kind: "line", x1, y1, x2, y2, ...paint(...classes) }
}

/** How many decimals a tick of `step` needs. */
export function tickDecimals(step: number): number {
  if (step >= 1) return 0
  return Math.min(6, Math.ceil(-Math.log10(step)))
}

/** A tick's text: the number, without the unit. */
export function tickText(value: number, ticks: readonly number[]): string {
  const [first, second] = ticks
  const step = first !== undefined && second !== undefined ? second - first : 1
  return formatNumber(value, { unit: null, decimals: tickDecimals(step) })
}

/** Where the plot area of a chart sits. */
export type Plot = { left: number; top: number; right: number; bottom: number }

/**
 * The value axis of `scale` along a plot: a faint gridline and a label per
 * tick, and the baseline at zero (or the domain's floor) a little darker.
 * `vertical`: values go up (bar, line); else they go right.
 */
export function valueAxis(
  scale: Scale,
  plot: Plot,
  vertical: boolean
): Graphic[] {
  const parts: Graphic[] = []
  const base = baseOf(scale)
  for (const tick of scale.ticks) {
    const at = scale.at(tick)
    const text = tickText(tick, scale.ticks)
    if (vertical) {
      if (tick !== base)
        parts.push(rule(plot.left, at, plot.right, at, "line-rule"))
      parts.push(label(plot.left - 8, at + 3, text, "tick", "end"))
      continue
    }
    if (tick !== base)
      parts.push(rule(at, plot.top, at, plot.bottom, "line-rule"))
    parts.push(label(at, plot.bottom + 14, text, "tick", "middle"))
  }
  const zero = scale.at(base)
  if (vertical) parts.push(rule(plot.left, zero, plot.right, zero, "line-soft"))
  else parts.push(rule(zero, plot.top, zero, plot.bottom, "line-soft"))
  return parts
}

/** The value the baseline sits on: zero when the domain holds it. */
export function baseOf(scale: Pick<Scale, "min" | "max">): number {
  if (scale.min <= 0 && scale.max >= 0) return 0
  return scale.min
}

/** The width of the widest tick label of `scale`. */
export function tickWidth(scale: Scale): number {
  return Math.max(
    ...scale.ticks.map((tick) =>
      textWidth(tickText(tick, scale.ticks), 8, "mono")
    )
  )
}

/** An x label as written, or a date shown in Spanish when it is one. */
export function xLabel(written: string): string {
  const date = parseDate(written)
  if (date === null) return written
  return formatDate(date)
}

/**
 * Reports each series whose value count differs from `count` (the
 * categories or x values) and keeps only those that match.
 */
export function matchingSeries<T extends { values: readonly unknown[] }>(
  series: readonly { at: string; value: T }[],
  count: number,
  what: string,
  report: Report
): { at: string; value: T }[] {
  return series.filter(({ at, value }) => {
    if (value.values.length === count) return true
    report(
      `${at}.values`,
      `Lleva ${count} valores, uno por ${what}, y tiene ${value.values.length}`
    )
    return false
  })
}

/** `value` formatted, with a sign before a rise ("+1.200"). */
export function signed(value: number, format: ValueFormat): string {
  if (value > 0) return `+${formatNumber(value, format)}`
  return formatNumber(value, format)
}
