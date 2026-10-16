import type { ElementContent } from "hast"
import type { Catalog, Entity } from "#contract/catalog"
import type { PageProblem } from "#contract/problems"
import type {
  Anchor,
  EdgeKind,
  Head,
  Hue,
  NodeKind,
  Route,
  Shape,
} from "#diagrams/schema"

// What every diagram module shares (`content-diagrams`,
// `content-diagram-types`): a read diagram with its boxes, arrows, zones and
// notes, the shapes, legend and text version a typed form adds, and the file
// it was read from. Reading (`read.ts`, `drawn.ts`), laying out (`types/`)
// and drawing (`figure.ts`, `svg.ts`) all build on these and never on each
// other's internals.

export type DiagramRow = {
  key: string | null
  name: string
  type: string | null
}

export type DiagramBox = {
  id: string | null
  x: number
  y: number
  w: number
  /** For a table, the height its rows take. */
  h: number
  kind: NodeKind
  tag: string | null
  name: string
  sub: string[]
  /** Its own shape, or the one `shapes` gives its kind. */
  shape: BoxShape | null
  /** Its own hue, or its zone's. */
  hue: Hue | null
  zone: string | null
  info: string | null
  trace: boolean
  needs: string[]
  /** The catalog entity it stands for, if any. */
  entity: Entity | null
  /** The page path it links to: its entity's page, or its `page`. */
  link: string | null
  /** A table's columns, `null` for a plain box. */
  rows: DiagramRow[] | null
  /** A table's second section (a UML class's operations), `null` without. */
  ops: DiagramRow[] | null
  more: string | null
}

/** A box's outline: a drawn diagram's shapes, plus a flowchart's `io`. */
export type BoxShape = Shape | "parallelogram"

export type Point = readonly [number, number]

export type DiagramEdge = {
  /** Its position in `edges`, which ties its line, label and hit band. */
  index: number
  /** `null` for a badge. */
  points: Point[] | null
  from: string | null
  to: string | null
  toZone: string | null
  kind: EdgeKind
  label: string | null
  at: Point | null
  anchor: Anchor
  /** A default arrow's own hue, or with `colorEdges` its `from` box's. */
  hue: Hue | null
  info: string | null
  noHead: boolean
  /** What the line ends in, unless `noHead`. */
  head: Head
  /** Right angles with rounded corners, or a smooth curve. */
  route: Route
  badge: string | null
}

export type DiagramZone = {
  id: string | null
  x: number
  y: number
  w: number
  h: number
  label: string
  hue: Hue | null
}

export type DiagramNote = { x: number; y: number; text: string; anchor: Anchor }

export type Diagram = {
  id: string
  title: string
  description: string
  /** The drawing area, the legend going under it; `null` when not drawable. */
  size: { width: number; height: number } | null
  nodes: DiagramBox[]
  edges: DiagramEdge[]
  zones: DiagramZone[]
  notes: DiagramNote[]
  kindNames: Partial<Record<NodeKind, string>>
  edgeNames: Partial<Record<EdgeKind, string>>
  badgeName: string | null
  /** The shape of each kind of box, for its legend sample. */
  shapes: Partial<Record<NodeKind, Shape>>
  /** The typed form it is (`content-diagram-types`), `null` drawn. */
  type: string | null
  /** A typed form's shapes under and over its boxes. */
  under: Graphic[]
  over: Graphic[]
  /** A typed form's own legend; `null`: the kinds the diagram uses. */
  legend: LegendEntry[] | null
  /** A typed form's text version; `null`: its zones and connections. */
  text: TextBlock[] | null
  /** The catalog entities its boxes and items stand for. */
  entities: Entity[]
  /** A hand-drawn `.svg` diagram's drawing, `null` for any other. */
  illustration: { viewBox: string; children: ElementContent[] } | null
}

/** A diagram file read: what could be kept of it, and what went wrong. */
export type DiagramFile = {
  id: string
  /** Path relative to the content root (`diagrams/red.json`). */
  file: string
  /** `null` when the file is not JSON or not an object. */
  diagram: Diagram | null
  problems: PageProblem[]
}

/** What a diagram's boxes can point at. */
export type DiagramContext = {
  catalog: Catalog
  /** The repository's page paths. */
  pages: ReadonlySet<string>
}

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

/** The faces a text is drawn in, which `measure.ts` measures. */
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

/** How many runs the accent arrows make, joined through shared boxes. */
export function accentPaths(edges: readonly DiagramEdge[]): number {
  const parent = new Map<string, string>()
  const find = (id: string): string => {
    const up = parent.get(id)
    if (up === undefined || up === id) return id
    const root = find(up)
    parent.set(id, root)
    return root
  }
  let loose = 0
  for (const edge of edges) {
    const ends = [edge.from, edge.to].filter((end) => end !== null)
    if (ends.length === 0) {
      loose += 1
      continue
    }
    for (const end of ends) if (!parent.has(end)) parent.set(end, end)
    const [first, second] = ends
    if (first !== undefined && second !== undefined)
      parent.set(find(second), find(first))
  }
  const roots = new Set([...parent.keys()].map(find))
  return roots.size + loose
}
