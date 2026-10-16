import type { Point } from "#diagrams/model"
import type { Anchor } from "#diagrams/schema"

// Angles and points around a centre for the radial charts (radar, polar):
// the first spoke at twelve o'clock, the rest clockwise and evenly spaced.

/** The angle of spoke `index` of `count`, in radians, the first at the top. */
export function spokeAngle(index: number, count: number): number {
  return -Math.PI / 2 + (2 * Math.PI * index) / count
}

/** The point `radius` from (cx, cy) at `angle`. */
export function polarPoint(
  cx: number,
  cy: number,
  radius: number,
  angle: number
): Point {
  return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)]
}

/** How a label outside the ring at `angle` is anchored: by its side. */
export function sideAnchor(angle: number): Anchor {
  const x = Math.cos(angle)
  if (Math.abs(x) < 0.2) return "middle"
  if (x > 0) return "start"
  return "end"
}

/** A label's baseline outside the ring, nudged down at the bottom. */
export function labelPoint(
  cx: number,
  cy: number,
  radius: number,
  angle: number
): Point {
  const [x, y] = polarPoint(cx, cy, radius, angle)
  const below = Math.sin(angle) > 0.2 ? 8 : 0
  const level = Math.abs(Math.sin(angle)) <= 0.2 ? 3 : 0
  return [x, y + below + level]
}

/**
 * A wedge from the centre between `start` and `end` (radians, clockwise),
 * `radius` long: `M centre L … A … Z`.
 */
export function wedgePath(
  cx: number,
  cy: number,
  radius: number,
  start: number,
  end: number
): string {
  const [x1, y1] = polarPoint(cx, cy, radius, start)
  const [x2, y2] = polarPoint(cx, cy, radius, end)
  const large = end - start > Math.PI ? 1 : 0
  const r = n(radius)
  return `M${n(cx)} ${n(cy)} L${n(x1)} ${n(y1)} A${r} ${r} 0 ${large} 1 ${n(x2)} ${n(y2)} Z`
}

function n(value: number): string {
  return String(Math.round(value * 10) / 10)
}
