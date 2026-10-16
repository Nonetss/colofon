import { z } from "zod"
import { optional, type Report } from "#pages/diagram-read"
import type { Anchor, Hue } from "#pages/diagram-schema"
import {
  type Datum,
  type Graphic,
  type GraphicShape,
  paint,
  type TextRole,
} from "#pages/diagram-types/scene"
import {
  formatFields,
  formatOf,
  type ValueFormat,
} from "#pages/diagram-types/values"

// Small pieces the area, grid and flow charts share (heatmap, treemap,
// radar, polar, Sankey): data marks with an id each, texts, and the hues a
// series takes when it has none of its own.

/** The hues the series take in order, when they have none of their own. */
export const SERIES_HUES: readonly Hue[] = [
  "blue",
  "teal",
  "violet",
  "rose",
  "lime",
  "indigo",
]

/** The hue of the `index`th series: its own, or the next of the palette. */
export function seriesHue(own: Hue | undefined, index: number): Hue {
  if (own !== undefined) return own
  return SERIES_HUES[index % SERIES_HUES.length] ?? "blue"
}

/** Gives each data mark of a drawing its own id: `m0`, `m1`… */
export function markIds(): () => string {
  let next = 0
  return () => {
    const id = `m${next}`
    next += 1
    return id
  }
}

export function datumOf(
  id: string,
  label: string,
  series: string | null,
  value: string,
  info: string | null = null
): Datum {
  return { id, label, series, value, info }
}

/** A shape painted with `classes`, optionally a data mark. */
export function shape(
  geometry: GraphicShape,
  classes: string[],
  options: {
    hue?: Hue | null
    opacity?: number | null
    datum?: Datum | null
    link?: string | null
  } = {}
): Graphic {
  return {
    ...geometry,
    ...paint(...classes),
    hue: options.hue ?? null,
    opacity: options.opacity ?? null,
    datum: options.datum ?? null,
    link: options.link ?? null,
  }
}

/** A text at (x, y) in `role`'s face. */
export function label(
  x: number,
  y: number,
  text: string,
  role: TextRole,
  anchor: Anchor,
  classes: string[] = [],
  mask = false
): Graphic {
  return shape({ kind: "text", x, y, text, role, anchor, mask }, classes)
}

/** A coordinate rounded to a tenth of a pixel. */
export function round(value: number): number {
  return Math.round(value * 10) / 10
}

const formatSchema = z.object(formatFields())

/** How the file's values print: its `unit` and `decimals`, checked. */
export function readFormat(
  data: Record<string, unknown>,
  report: Report
): ValueFormat {
  const written: Record<string, unknown> = {}
  if (data.unit !== undefined) written.unit = data.unit
  if (data.decimals !== undefined) written.decimals = data.decimals
  const read = optional(formatSchema, written, "", report)
  if (read === undefined) return { unit: null, decimals: 0 }
  return formatOf(read)
}
