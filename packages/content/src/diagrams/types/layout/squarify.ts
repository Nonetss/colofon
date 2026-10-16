// Squarified treemap (Bruls, Huizing and van Wijk): rectangles whose areas
// follow their values, laid in rows along the shorter side so each one stays
// as close to a square as it can.

export type Rect = { x: number; y: number; w: number; h: number }

/**
 * A rectangle for each of `values` (positive, in any order) inside `area`,
 * in the order given; the biggest values should come first for the
 * squarest result.
 */
export function squarify(values: readonly number[], area: Rect): Rect[] {
  const total = values.reduce((sum, value) => sum + value, 0)
  const placed: Rect[] = values.map(() => ({ x: 0, y: 0, w: 0, h: 0 }))
  if (total <= 0 || area.w <= 0 || area.h <= 0) return placed
  const scale = (area.w * area.h) / total
  const items = values.map((value, index) => ({ index, size: value * scale }))
  let free: Rect = { ...area }
  let row: { index: number; size: number }[] = []
  const side = () => Math.min(free.w, free.h)
  for (const item of items) {
    const next = [...row, item]
    if (row.length === 0 || worst(next, side()) <= worst(row, side())) {
      row = next
      continue
    }
    free = layRow(row, free, placed)
    row = [item]
  }
  if (row.length > 0) layRow(row, free, placed)
  return placed
}

/** The worst aspect ratio of a row of `sizes` laid along `side`. */
function worst(row: readonly { size: number }[], side: number): number {
  const sum = row.reduce((total, item) => total + item.size, 0)
  const sizes = row.map((item) => item.size)
  const big = Math.max(...sizes)
  const small = Math.min(...sizes)
  return Math.max(
    (side * side * big) / (sum * sum),
    (sum * sum) / (side * side * small)
  )
}

/** Lays `row` along the shorter side of `free`; returns what is left. */
function layRow(
  row: readonly { index: number; size: number }[],
  free: Rect,
  placed: Rect[]
): Rect {
  const sum = row.reduce((total, item) => total + item.size, 0)
  if (free.w >= free.h) {
    const width = sum / free.h
    let y = free.y
    for (const item of row) {
      const h = item.size / width
      placed[item.index] = { x: free.x, y, w: width, h }
      y += h
    }
    return { x: free.x + width, y: free.y, w: free.w - width, h: free.h }
  }
  const height = sum / free.w
  let x = free.x
  for (const item of row) {
    const w = item.size / height
    placed[item.index] = { x, y: free.y, w, h: height }
    x += w
  }
  return { x: free.x, y: free.y + height, w: free.w, h: free.h - height }
}
