import {
  type Cell,
  type Lanes,
  measureGrid,
  type Route,
  routeLink,
} from "#pages/diagram-types/layout/grid-route"
import {
  type Link,
  orderRanks,
  rankNodes,
} from "#pages/diagram-types/layout/ranks"
import type { Point } from "#pages/diagrams"

// Boxes on a grid of rows and columns, with their links routed through the
// gutters (flowchart, state machine, swimlane, dependency graph). A box's
// row is the one it is given or its rank (its longest distance from a
// start); its column the one it is given or its place in its row, ordered
// to reduce crossings and centred under the longest row.

export type LayeredNode = {
  id: string
  w: number
  h: number
  row: number | null
  col: number | null
}

export type LayeredOptions = {
  /** The top left corner of the first row and column. */
  left: number
  top: number
  rowGap: number
  colGap: number
  /** The rows' heights, for forms whose rows are lanes; else each row's tallest box. */
  rowHeight?: number
  /** Where ranking starts; by default the nodes no link reaches. */
  starts?: readonly string[]
}

export type Layered = {
  cells: Map<string, Cell>
  /** One route per link, `null` for a self-link or a link with an unknown end. */
  routes: (Route | null)[]
  /** The indexes of the links that close a cycle. */
  back: Set<number>
  cycles: string[][]
  /** The right and bottom edges of everything drawn, routes included. */
  right: number
  bottom: number
}

export function layered(
  nodes: readonly LayeredNode[],
  links: readonly Link[],
  options: LayeredOptions
): Layered {
  const ids = nodes.map((node) => node.id)
  const ranked = rankNodes(ids, links, options.starts)
  const rowOf = new Map<string, number>()
  for (const node of nodes)
    rowOf.set(node.id, givenOr(node.row, ranked.rank.get(node.id)))
  const rows = orderRanks(ids, rowOf, links)
  const longest = Math.max(1, ...rows.map((row) => row.length))
  const colOf = new Map<string, number>()
  for (const row of rows) {
    const shift = Math.floor((longest - row.length) / 2)
    row.forEach((id, index) => {
      colOf.set(id, index + shift)
    })
  }
  for (const node of nodes) if (node.col !== null) colOf.set(node.id, node.col)

  const colWidth: number[] = []
  const rowHeight: number[] = []
  for (const node of nodes) {
    const col = colOf.get(node.id) ?? 0
    const row = rowOf.get(node.id) ?? 0
    colWidth[col] = Math.max(colWidth[col] ?? 0, node.w)
    rowHeight[row] = Math.max(rowHeight[row] ?? 0, rowSize(node, options))
  }
  const colX = offsets(colWidth, options.left, options.colGap)
  const rowY = offsets(rowHeight, options.top, options.rowGap)
  const cells = new Map<string, Cell>()
  for (const node of nodes) {
    const col = colOf.get(node.id) ?? 0
    const row = rowOf.get(node.id) ?? 0
    const x = (colX[col] ?? 0) + ((colWidth[col] ?? 0) - node.w) / 2
    const y = (rowY[row] ?? 0) + ((rowHeight[row] ?? 0) - node.h) / 2
    cells.set(node.id, { row, col, x, y, w: node.w, h: node.h })
  }
  const grid = measureGrid([...cells.values()])
  const lanes: Lanes = new Map()
  const routes = links.map((link) => {
    const from = cells.get(link.from)
    const to = cells.get(link.to)
    if (from === undefined || to === undefined || from === to) return null
    return routeLink(grid, from, to, lanes)
  })
  let right = 0
  let bottom = 0
  for (const cell of cells.values()) {
    right = Math.max(right, cell.x + cell.w)
    bottom = Math.max(bottom, cell.y + cell.h)
  }
  for (const route of routes) {
    for (const point of pointsOf(route)) {
      right = Math.max(right, point[0])
      bottom = Math.max(bottom, point[1])
    }
  }
  return {
    cells,
    routes,
    back: ranked.back,
    cycles: ranked.cycles,
    right,
    bottom,
  }
}

function givenOr(given: number | null, ranked: number | undefined): number {
  if (given !== null) return given
  return ranked ?? 0
}

function rowSize(node: LayeredNode, options: LayeredOptions): number {
  if (options.rowHeight !== undefined) return options.rowHeight
  return node.h
}

/** Where each of `sizes` starts, from `start`, `gap` apart; empty slots take no room. */
function offsets(
  sizes: readonly number[],
  start: number,
  gap: number
): number[] {
  const at: number[] = []
  let position = start
  for (let index = 0; index < sizes.length; index++) {
    at[index] = position
    const size = sizes[index] ?? 0
    position += size + gap
  }
  return at
}

function pointsOf(route: Route | null): readonly Point[] {
  if (route === null) return []
  return route.points
}
