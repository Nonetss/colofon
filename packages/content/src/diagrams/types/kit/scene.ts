import type { z } from "zod"
import type { Entity } from "#catalog"
import type { Report } from "#pages/diagram-read"
import type {
  Anchor,
  EdgeKind,
  Head,
  Hue,
  NodeKind,
  References,
} from "#pages/diagram-schema"
import type {
  BoxShape,
  DiagramBox,
  DiagramContext,
  DiagramEdge,
  DiagramNote,
  DiagramZone,
  Point,
} from "#pages/diagrams"

// What a typed diagram form lays out (`content-diagram-types`): the same
// boxes, arrows, zones and notes a drawn diagram has, so the reader's
// highlighting, links and text version work on them unchanged, plus the
// shapes only a typed form draws (bars, dots, ribbons, axes, bands), a
// legend of its own and a text version of its own. `diagram-svg.ts` draws
// it; `diagram-types/index.ts` lists the forms.

/**
 * What a shape's paint says, as `doc-diagram-*` classes without the prefix
 * (`fill-accent`, `line-rule`…): the reader's CSS turns them into the
 * theme's colours, so a drawing follows light and dark.
 */
export type Paint = {
  classes: string[]
  /** Tints the classes that take a hue (`fill-hue`, `line-hue`…). */
  hue: Hue | null
  /** `fill-opacity`, for ramps and translucent areas; `null`: opaque. */
  opacity: number | null
  /** A data mark: what hovering it shows and lights up. */
  datum: Datum | null
  /** A page path the shape links to. */
  link: string | null
}

/** A data mark's identity, as the reader's card shows it. */
export type Datum = {
  /** Unique in the drawing (`m0`, `m1`…). */
  id: string
  label: string
  /** The series it belongs to, lit with it; `null` for none. */
  series: string | null
  /** Its value, already formatted ("1.200 usuarios"). */
  value: string
  info: string | null
}

/** The faces a text is drawn in, which `diagram-measure.ts` measures. */
export const TEXT_ROLES = {
  /** Small monospace capitals, as an arrow's label. */
  label: { size: 8, font: "mono", tracking: 0.06 },
  /** A box's name. */
  name: { size: 12, font: "sans", tracking: 0 },
  /** A box's lines under its name. */
  sub: { size: 9, font: "mono", tracking: 0 },
  /** Spaced small capitals, as the legend's and a zone's title. */
  legend: { size: 8, font: "mono", tracking: 0.14 },
  /** An axis tick. */
  tick: { size: 8, font: "mono", tracking: 0 },
  /** A value printed by its mark. */
  value: { size: 9, font: "mono", tracking: 0 },
  /** A plain sans text, as a legend item. */
  item: { size: 11, font: "sans", tracking: 0 },
} as const satisfies Record<
  string,
  { size: number; font: "mono" | "sans"; tracking: number }
>

export type TextRole = keyof typeof TEXT_ROLES

export type GraphicShape =
  | { kind: "rect"; x: number; y: number; w: number; h: number; r: number }
  | { kind: "circle"; cx: number; cy: number; r: number }
  | { kind: "path"; d: string }
  | { kind: "polygon"; points: Point[] }
  | { kind: "line"; x1: number; y1: number; x2: number; y2: number }
  | {
      kind: "text"
      x: number
      y: number
      text: string
      role: TextRole
      anchor: Anchor
      /** Draws an opaque paper mask behind it. */
      mask: boolean
    }

/** A shape a typed form draws besides boxes and arrows. */
export type Graphic = GraphicShape & Paint

/** A legend entry's sample. */
export type LegendSample =
  | { kind: "node"; node: NodeKind; shape: BoxShape | null }
  | { kind: "edge"; edge: EdgeKind; head?: Head }
  /** A 16×8 swatch painted as the marks it stands for. */
  | {
      kind: "swatch"
      classes: string[]
      hue: Hue | null
      /** Its fill opacity, as the translucent marks it stands for. */
      opacity?: number
    }
  | { kind: "dot"; classes: string[]; hue: Hue | null }
  | { kind: "line"; classes: string[]; hue: Hue | null }

export type LegendEntry = {
  name: string
  sample: LegendSample
  /** Hovering it lights the marks of this series. */
  series: string | null
}

/** A piece of a text-version line: text, or a box's (linked) name. */
export type TextPart = string | { box: string }

export type TextTree = { line: TextPart[]; children: TextTree[] }

/** A block of a typed diagram's text version (screen readers, `llm.txt`). */
export type TextBlock =
  | { kind: "list"; ordered: boolean; items: TextPart[][] }
  | { kind: "tree"; items: TextTree[] }
  | { kind: "table"; head: string[]; rows: string[][] }

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
