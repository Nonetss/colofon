import type { Anchor } from "#pages/diagram-schema"
import type { Point } from "#pages/diagrams"

// Right-angle routes between the boxes of a grid (flowchart, state,
// swimlane, dependency): a link leaves its box on the side facing its target
// and travels through the gutters between rows and columns, so it never
// crosses a box. A link to an earlier row goes round the grid's right side.
// Links sharing a gutter are spread into lanes so they do not overlap.

/** A box placed on the grid. */
export type Cell = {
  row: number
  col: number
  x: number
  y: number
  w: number
  h: number
}

export type Grid = {
  cells: readonly Cell[]
  /** The top and bottom of each row's tallest box. */
  rowTop: readonly number[]
  rowBottom: readonly number[]
  /** The left and right of each column's widest box. */
  colLeft: readonly number[]
  colRight: readonly number[]
}

export type Route = { points: Point[]; at: Point; anchor: Anchor }

/** How many links already run in each gutter, to spread the next one. */
export type Lanes = Map<string, number>

/** The spacing between two links in one gutter. */
const LANE = 6

/** How far past the grid's right side the back links run. */
const MARGIN = 20

function centreX(cell: Cell): number {
  return cell.x + cell.w / 2
}

function centreY(cell: Cell): number {
  return cell.y + cell.h / 2
}

/** The offset of the next lane in `key`: 0, +6, −6, +12… */
function lane(lanes: Lanes, key: string): number {
  const used = lanes.get(key) ?? 0
  lanes.set(key, used + 1)
  const step = Math.ceil(used / 2) * LANE
  if (used % 2 === 1) return step
  return -step
}

/** The y of the gutter under `row` (above row 0 for −1). */
function rowGutter(grid: Grid, row: number): number {
  const below = grid.rowTop[row + 1]
  const above = grid.rowBottom[row]
  if (above !== undefined && below !== undefined) return (above + below) / 2
  if (above !== undefined) return above + 20
  return (grid.rowTop[0] ?? 0) - 20
}

/** The x of the gutter right of `col` (left of column 0 for −1). */
function colGutter(grid: Grid, col: number): number {
  const left = grid.colRight[col]
  const right = grid.colLeft[col + 1]
  if (left !== undefined && right !== undefined) return (left + right) / 2
  if (left !== undefined) return left + 20
  return (grid.colLeft[0] ?? 0) - 20
}

function gridRight(grid: Grid): number {
  return Math.max(...grid.colRight.filter(Number.isFinite))
}

/** Is there a box other than `ends` on the vertical line x from y1 to y2? */
function blockedVertical(
  grid: Grid,
  x: number,
  y1: number,
  y2: number,
  ends: readonly Cell[]
): boolean {
  const top = Math.min(y1, y2)
  const bottom = Math.max(y1, y2)
  return grid.cells.some(
    (cell) =>
      !ends.includes(cell) &&
      cell.x < x &&
      x < cell.x + cell.w &&
      cell.y < bottom &&
      top < cell.y + cell.h
  )
}

/** Is there a box other than `ends` on the horizontal line y from x1 to x2? */
function blockedHorizontal(
  grid: Grid,
  y: number,
  x1: number,
  x2: number,
  ends: readonly Cell[]
): boolean {
  const left = Math.min(x1, x2)
  const right = Math.max(x1, x2)
  return grid.cells.some(
    (cell) =>
      !ends.includes(cell) &&
      cell.y < y &&
      y < cell.y + cell.h &&
      cell.x < right &&
      left < cell.x + cell.w
  )
}

/** The route from `from` to `to`, two different boxes of `grid`. */
export function routeLink(
  grid: Grid,
  from: Cell,
  to: Cell,
  lanes: Lanes
): Route {
  const ends = [from, to]
  if (to.row > from.row) return downwards(grid, from, to, ends, lanes)
  if (to.row === from.row) return across(grid, from, to, ends, lanes)
  return backwards(grid, from, to, lanes)
}

function downwards(
  grid: Grid,
  from: Cell,
  to: Cell,
  ends: readonly Cell[],
  lanes: Lanes
): Route {
  const sx = centreX(from)
  const sy = from.y + from.h
  const tx = centreX(to)
  if (Math.abs(sx - tx) < 1 && !blockedVertical(grid, sx, sy, to.y, ends))
    return withLabel([
      [sx, sy],
      [sx, to.y],
    ])
  // Far to one side: out of the box's side and down onto the target.
  const cy = centreY(from)
  const side = tx > sx ? from.x + from.w : from.x
  if (
    Math.abs(tx - sx) > from.w / 2 + 8 &&
    !blockedHorizontal(grid, cy, side, tx, ends) &&
    !blockedVertical(grid, tx, cy, to.y, ends)
  )
    return withLabel([
      [side, cy],
      [tx, cy],
      [tx, to.y],
    ])
  const below = rowGutter(grid, from.row) + lane(lanes, `row:${from.row}`)
  const above = rowGutter(grid, to.row - 1)
  if (to.row === from.row + 1 || !blockedVertical(grid, tx, below, to.y, ends))
    return withLabel([
      [sx, sy],
      [sx, below],
      [tx, below],
      [tx, to.y],
    ])
  // Down a column gutter beside the target, past the rows in between.
  const gutter = colGutter(grid, to.col) + lane(lanes, `col:${to.col}`)
  const into = above + lane(lanes, `row:${to.row - 1}`)
  return withLabel([
    [sx, sy],
    [sx, below],
    [gutter, below],
    [gutter, into],
    [tx, into],
    [tx, to.y],
  ])
}

function across(
  grid: Grid,
  from: Cell,
  to: Cell,
  ends: readonly Cell[],
  lanes: Lanes
): Route {
  const y = centreY(from)
  const rightwards = to.col > from.col
  const sx = rightwards ? from.x + from.w : from.x
  const tx = rightwards ? to.x : to.x + to.w
  if (!blockedHorizontal(grid, y, sx, tx, ends))
    return withLabel([
      [sx, y],
      [tx, y],
    ])
  const above =
    rowGutter(grid, from.row - 1) + lane(lanes, `row:${from.row - 1}`)
  return withLabel([
    [centreX(from), from.y],
    [centreX(from), above],
    [centreX(to), above],
    [centreX(to), to.y],
  ])
}

function backwards(grid: Grid, from: Cell, to: Cell, lanes: Lanes): Route {
  const x = gridRight(grid) + MARGIN + Math.abs(lane(lanes, "right"))
  const below = rowGutter(grid, from.row) + lane(lanes, `row:${from.row}`)
  const above = rowGutter(grid, to.row - 1) + lane(lanes, `row:${to.row - 1}`)
  return withLabel([
    [centreX(from), from.y + from.h],
    [centreX(from), below],
    [x, below],
    [x, above],
    [centreX(to), above],
    [centreX(to), to.y],
  ])
}

/**
 * The route with its label on its first long horizontal segment, where a
 * label reads best, or else beside its first segment.
 */
function withLabel(points: Point[]): Route {
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]
    const b = points[i]
    if (a === undefined || b === undefined) continue
    if (a[1] === b[1] && Math.abs(b[0] - a[0]) >= 40)
      return { points, at: [(a[0] + b[0]) / 2, a[1] - 6], anchor: "middle" }
  }
  const [a, b] = points
  if (a === undefined || b === undefined)
    return { points, at: [0, 0], anchor: "middle" }
  return { points, at: [a[0] + 6, (a[1] + b[1]) / 2 + 3], anchor: "start" }
}

/**
 * The rows and columns of `cells`, measured: each row as tall as its
 * tallest box, each column as wide as its widest.
 */
export function measureGrid(cells: readonly Cell[]): Grid {
  const rowTop: number[] = []
  const rowBottom: number[] = []
  const colLeft: number[] = []
  const colRight: number[] = []
  for (const cell of cells) {
    widen(rowTop, cell.row, cell.y, Math.min)
    widen(rowBottom, cell.row, cell.y + cell.h, Math.max)
    widen(colLeft, cell.col, cell.x, Math.min)
    widen(colRight, cell.col, cell.x + cell.w, Math.max)
  }
  return { cells, rowTop, rowBottom, colLeft, colRight }
}

function widen(
  list: number[],
  index: number,
  value: number,
  pick: (a: number, b: number) => number
) {
  const current = list[index]
  if (current === undefined) list[index] = value
  else list[index] = pick(current, value)
}
