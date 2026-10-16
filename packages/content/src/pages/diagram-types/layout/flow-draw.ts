import { textWidth } from "#pages/diagram-measure"
import type { Report } from "#pages/diagram-read"
import type { Anchor, EdgeKind, Head } from "#pages/diagram-schema"
import {
  type Datum,
  type Graphic,
  type GraphicShape,
  paint,
  TEXT_ROLES,
  type TextRole,
} from "#pages/diagram-types/scene"
import type { DiagramEdge, Point } from "#pages/diagrams"

// Small drawing helpers the time and flow forms share (sequence, timeline,
// Gantt, swimlane, kanban, story map, journey): shapes painted by classes,
// texts in a role, arrows as a drawn diagram's edges, and text measures.

/** `shape` painted by `classes`. */
export function shape(shape: GraphicShape, ...classes: string[]): Graphic {
  return { ...shape, ...paint(...classes) }
}

export function rectShape(
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  ...classes: string[]
): Graphic {
  return shape({ kind: "rect", x, y, w, h, r }, ...classes)
}

export function lineShape(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  ...classes: string[]
): Graphic {
  return shape({ kind: "line", x1, y1, x2, y2 }, ...classes)
}

/** A text at (x, y), its baseline, in `role`. */
export function textShape(
  x: number,
  y: number,
  text: string,
  role: TextRole,
  anchor: Anchor,
  ...classes: string[]
): Graphic {
  return shape(
    { kind: "text", x, y, text, role, anchor, mask: false },
    ...classes
  )
}

/** The same text over an opaque paper mask. */
export function maskedText(
  x: number,
  y: number,
  text: string,
  role: TextRole,
  anchor: Anchor,
  ...classes: string[]
): Graphic {
  return shape(
    { kind: "text", x, y, text, role, anchor, mask: true },
    ...classes
  )
}

/** `graphic` as a data mark. */
export function withDatum(graphic: Graphic, datum: Datum): Graphic {
  return { ...graphic, datum }
}

/** `graphic` linking to `link`, when there is one. */
export function withLink(graphic: Graphic, link: string | null): Graphic {
  return { ...graphic, link }
}

/** How wide `text` is drawn in `role`. */
export function roleWidth(text: string, role: TextRole): number {
  const face = TEXT_ROLES[role]
  return textWidth(text, face.size, face.font, face.tracking)
}

/** Reports `text` at `at` when it does not fit `width` in `role`. */
export function checkFits(
  text: string,
  role: TextRole,
  width: number,
  at: string,
  report: Report
) {
  const drawn = roleWidth(text, role)
  if (drawn > width)
    report(
      at,
      `"${text}" (${Math.round(drawn)}px) no cabe en ${Math.round(width)}px`
    )
}

/** An arrow drawn as a drawn diagram's edge, so the reader lights it. */
export function arrowEdge(arrow: {
  index: number
  from: string | null
  to: string | null
  points: Point[]
  kind: EdgeKind
  label: string | null
  at: Point | null
  anchor: Anchor
  info?: string | null
  head?: Head
  noHead?: boolean
}): DiagramEdge {
  return {
    index: arrow.index,
    points: arrow.points,
    from: arrow.from,
    to: arrow.to,
    toZone: null,
    kind: arrow.kind,
    label: arrow.label,
    at: arrow.at,
    anchor: arrow.anchor,
    hue: null,
    info: arrow.info ?? null,
    noHead: arrow.noHead === true,
    head: arrow.head ?? "arrow",
    route: "orthogonal",
    badge: null,
  }
}

/** Rounded up to the 4px grid. */
export function grid4(value: number): number {
  return Math.ceil(value / 4) * 4
}
