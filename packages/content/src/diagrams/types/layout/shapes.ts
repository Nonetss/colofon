import type { Anchor, Hue } from "#pages/diagram-schema"
import type { Item } from "#pages/diagram-types/items"
import {
  type Datum,
  type Graphic,
  paint,
  type TextRole,
} from "#pages/diagram-types/scene"
import type { Point } from "#pages/diagrams"

// Shorthands for the shapes the concept forms draw (quadrant, Venn, pyramid,
// layers, loop, fishbone, matrix, Wardley map): each returns a plain
// `Graphic` that a form can spread and override (`{ ...rectAt(…), hue }`).

export function rectAt(
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  ...classes: string[]
): Graphic {
  return { kind: "rect", x, y, w, h, r, ...paint(...classes) }
}

export function circleAt(
  cx: number,
  cy: number,
  r: number,
  ...classes: string[]
): Graphic {
  return { kind: "circle", cx, cy, r, ...paint(...classes) }
}

export function lineAt(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  ...classes: string[]
): Graphic {
  return { kind: "line", x1, y1, x2, y2, ...paint(...classes) }
}

export function pathOf(d: string, ...classes: string[]): Graphic {
  return { kind: "path", d, ...paint(...classes) }
}

export function polygonOf(points: Point[], ...classes: string[]): Graphic {
  return { kind: "polygon", points, ...paint(...classes) }
}

export function textAt(
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

/** A filled arrowhead whose tip is `tip`, pointing along (dx, dy). */
export function arrowheadAt(
  tip: Point,
  dx: number,
  dy: number,
  ...classes: string[]
): Graphic {
  const length = Math.hypot(dx, dy)
  const ux = dx / length
  const uy = dy / length
  const baseX = tip[0] - ux * 9
  const baseY = tip[1] - uy * 9
  return polygonOf(
    [
      [tip[0], tip[1]],
      [baseX - uy * 3.6, baseY + ux * 3.6],
      [baseX + uy * 3.6, baseY - ux * 3.6],
    ],
    ...classes
  )
}

/** Hands out the drawing's mark ids: `m0`, `m1`… */
export function markIds(): () => string {
  let next = 0
  return () => {
    const id = `m${next}`
    next += 1
    return id
  }
}

/** A datum for an item: its name, the value shown and its `info`. */
export function itemDatum(
  id: string,
  item: Item,
  value: string,
  series: string | null = null
): Datum {
  return { id, label: item.name, series, value, info: item.info }
}

/** The fill and line classes of an item: accent when focal, its hue's tint, or `plain`. */
export function itemPaint(
  item: { focal: boolean; hue: Hue | null },
  plain: readonly string[]
): { classes: string[]; hue: Hue | null } {
  if (item.focal)
    return { classes: ["fill-accent-tint", "line-accent"], hue: null }
  if (item.hue !== null)
    return { classes: ["fill-hue-tint", "line-hue"], hue: item.hue }
  return { classes: [...plain], hue: null }
}

/** The text class of an item's name: accent when focal, its hue, or ink. */
export function itemTextClass(item: {
  focal: boolean
  hue: Hue | null
}): string {
  if (item.focal) return "text-accent"
  if (item.hue !== null) return "text-hue"
  return "text-ink"
}
