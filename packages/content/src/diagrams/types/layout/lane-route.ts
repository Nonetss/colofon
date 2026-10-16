import type { Point } from "#diagrams/model"
import type {
  Cell,
  Grid,
  Lanes,
  Route,
} from "#diagrams/types/layout/grid-route"

// Routes of a swimlane, where time runs left to right and a handoff crosses
// from one band to another: a link to a later column leaves its step's side,
// turns in the gutter beside the target's column and enters the target's
// side; a link within one column runs straight up or down. A route that
// would cross another step is not drawn here (`null`), and the caller falls
// back to the grid's routes.

const LANE = 6

function centreY(cell: Cell): number {
  return cell.y + cell.h / 2
}

function centreX(cell: Cell): number {
  return cell.x + cell.w / 2
}

function lane(lanes: Lanes, key: string): number {
  const used = lanes.get(key) ?? 0
  lanes.set(key, used + 1)
  const step = Math.ceil(used / 2) * LANE
  if (used % 2 === 1) return step
  return -step
}

/** Does the segment a→b cross a step other than `ends`? */
function blocked(
  grid: Grid,
  a: Point,
  b: Point,
  ends: readonly Cell[]
): boolean {
  const left = Math.min(a[0], b[0])
  const right = Math.max(a[0], b[0])
  const top = Math.min(a[1], b[1])
  const bottom = Math.max(a[1], b[1])
  return grid.cells.some(
    (cell) =>
      !ends.includes(cell) &&
      cell.x < right &&
      left < cell.x + cell.w &&
      cell.y < bottom &&
      top < cell.y + cell.h
  )
}

function clear(
  grid: Grid,
  points: readonly Point[],
  ends: readonly Cell[]
): boolean {
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]
    const b = points[i]
    if (a === undefined || b === undefined) continue
    if (blocked(grid, a, b, ends)) return false
  }
  return true
}

/** The swimlane route from `from` to `to`, or `null` to fall back. */
export function laneRoute(
  grid: Grid,
  from: Cell,
  to: Cell,
  lanes: Lanes
): Route | null {
  const ends = [from, to]
  if (to.col === from.col) {
    const down = to.row > from.row
    const sy = down ? from.y + from.h : from.y
    const ty = down ? to.y : to.y + to.h
    const points: Point[] = [
      [centreX(from), sy],
      [centreX(from), ty],
    ]
    if (Math.abs(centreX(from) - centreX(to)) > 1 || !clear(grid, points, ends))
      return null
    return labelled(points)
  }
  if (to.col < from.col) return null
  const sx = from.x + from.w
  const sy = centreY(from)
  const tx = to.x
  const ty = centreY(to)
  if (Math.abs(sy - ty) < 1) {
    const straight: Point[] = [
      [sx, sy],
      [tx, ty],
    ]
    if (clear(grid, straight, ends)) return labelled(straight)
  }
  // Turn in the gutter left of the target's column, else right of the source's.
  const beforeTarget =
    edgeOf(grid.colLeft[to.col], tx) - 28 + lane(lanes, `in:${to.col}`)
  const afterSource =
    edgeOf(grid.colRight[from.col], sx) + 28 + lane(lanes, `out:${from.col}`)
  for (const x of [beforeTarget, afterSource]) {
    const points: Point[] = [
      [sx, sy],
      [x, sy],
      [x, ty],
      [tx, ty],
    ]
    if (clear(grid, points, ends)) return labelled(points)
  }
  return null
}

/**
 * The route with its label: beside the turn of an elbow, so two elbows
 * leaving one side keep their labels apart; else on its single segment.
 */
function labelled(points: Point[]): Route {
  const [, turn, end] = points
  if (turn !== undefined && end !== undefined && turn[0] === end[0])
    return {
      points,
      at: [turn[0] + 6, (turn[1] + end[1]) / 2 + 3],
      anchor: "start",
    }
  const [a, b] = points
  if (a === undefined || b === undefined)
    return { points, at: [0, 0], anchor: "middle" }
  if (a[1] === b[1])
    return { points, at: [(a[0] + b[0]) / 2, a[1] - 6], anchor: "middle" }
  return { points, at: [a[0] + 6, (a[1] + b[1]) / 2 + 3], anchor: "start" }
}

/** A column's measured edge, or the box's own when it has none. */
function edgeOf(measured: number | undefined, own: number): number {
  if (measured === undefined) return own
  return measured
}
