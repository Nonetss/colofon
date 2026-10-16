import type { z } from "zod"
import type { Entity } from "#contract/catalog"
import type {
  DiagramBox,
  DiagramContext,
  DiagramEdge,
  DiagramNote,
  DiagramZone,
  Graphic,
  LegendEntry,
  Paint,
  TextBlock,
} from "#diagrams/model"
import type { Report } from "#diagrams/report"
import type { References } from "#diagrams/schema"

// What a typed diagram form lays out (`content-diagram-types`): the same
// boxes, arrows, zones and notes a drawn diagram has, so the reader's
// highlighting, links and text version work on them unchanged, plus the
// shapes only a typed form draws (bars, dots, ribbons, axes, bands), a
// legend of its own and a text version of its own, all of them typed in
// `diagrams/model.ts`. `diagrams/svg.ts` draws it; `diagrams/types/index.ts`
// lists the forms.

/** What a typed form lays out. */
export type Scene = {
  size: { width: number; height: number }
  nodes: DiagramBox[]
  edges: DiagramEdge[]
  zones: DiagramZone[]
  notes: DiagramNote[]
  /** Drawn first, over the paper: bands, grids, axes. */
  under: Graphic[]
  /** Drawn last, over the boxes: marks, labels. */
  over: Graphic[]
  legend: LegendEntry[]
  text: TextBlock[]
  /** How many elements carry the accent (two at most). */
  accents: number
}

/** What a typed form's reader gets. */
export type Tools = {
  report: Report
  context: DiagramContext
  /** The ids of the diagram's items, unique across the diagram. */
  ids: Set<string>
  /** The catalog entities its items stand for. */
  entities: Entity[]
}

/** A typed diagram form, as the registry lists it. */
export type TypeModule = {
  /** Its `type` value. */
  name: string
  /** How a problem names one of its diagrams ("Un Sankey"). */
  label: string
  /** Its own keys, besides `$schema`, `type`, `title`, `desc` and `variant`. */
  keys: readonly string[]
  /** Its `variant` values; none when it has no variants. */
  variants: readonly string[]
  /** The schema of a whole file of this type, for the editor. */
  schema: (references: References) => z.ZodType
  /** Lays it out, or `null` when nothing can be drawn (reported). */
  read: (
    data: Record<string, unknown>,
    tools: Tools,
    variant: string | null
  ) => Scene | null
}

/** A paint with no hue, opacity, datum or link. */
export function paint(...classes: string[]): Paint {
  return { classes, hue: null, opacity: null, datum: null, link: null }
}

/** An empty scene of `size`, to fill. */
export function emptyScene(size: { width: number; height: number }): Scene {
  return {
    size,
    nodes: [],
    edges: [],
    zones: [],
    notes: [],
    under: [],
    over: [],
    legend: [],
    text: [],
    accents: 0,
  }
}
