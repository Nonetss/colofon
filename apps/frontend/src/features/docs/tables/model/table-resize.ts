// Column widths of a documentation table. Until the reader drags a header
// edge the columns share the reading column; after that, each column has a
// pixel width. Dragging an edge gives the space to the next visible column,
// so the table keeps its width; the last column's edge changes the table,
// which then scrolls sideways when it no longer fits.

/** The narrowest a column can be dragged. */
export const MIN_COLUMN_WIDTH = 96
/** Width change per arrow key on a focused resize handle. */
const RESIZE_STEP_PX = 16

const widthsOf = new WeakMap<HTMLTableElement, number[]>()

export function clampColumnWidth(width: number): number {
  return Math.max(MIN_COLUMN_WIDTH, Math.round(width))
}

function nextVisible(hidden: readonly boolean[], index: number): number {
  for (let at = index + 1; at < hidden.length; at++) {
    if (hidden[at] !== true) return at
  }
  return -1
}

/**
 * Widths after moving column `index` by `delta` pixels. The next visible
 * column gives or takes that space; the last visible column moves alone.
 * Neither column goes under `MIN_COLUMN_WIDTH`.
 */
export function widthsAfterResize(
  widths: readonly number[],
  hidden: readonly boolean[],
  index: number,
  delta: number
): number[] {
  const current = widths[index]
  if (current === undefined) return [...widths]
  const next = [...widths]
  const neighbor = nextVisible(hidden, index)
  if (neighbor === -1) {
    next[index] = clampColumnWidth(current + delta)
    return next
  }
  const other = widths[neighbor]
  if (other === undefined) return next
  const grown = clampColumnWidth(current + delta)
  const shrunk = clampColumnWidth(other - (grown - current))
  const absorbed = other - shrunk
  next[index] = current + absorbed
  next[neighbor] = shrunk
  return next
}

/** Pixel width of each column, and the table's width: hidden columns take
 *  none. */
export function columnLayout(
  widths: readonly number[],
  hidden: readonly boolean[]
): { columnWidths: string[]; tableWidth: number } {
  const columnWidths: string[] = []
  let tableWidth = 0
  for (let index = 0; index < widths.length; index++) {
    if (hidden[index] === true) {
      columnWidths.push("0px")
      continue
    }
    const width = widths[index]
    const sized = width === undefined ? MIN_COLUMN_WIDTH : width
    tableWidth += sized
    columnWidths.push(`${sized}px`)
  }
  return { columnWidths, tableWidth }
}

function hiddenOf(headers: readonly HTMLTableCellElement[]): boolean[] {
  return headers.map((header) => header.hidden !== false)
}

function measuredWidths(headers: readonly HTMLTableCellElement[]): number[] {
  return headers.map((header) => {
    if (header.hidden) return MIN_COLUMN_WIDTH
    return clampColumnWidth(header.getBoundingClientRect().width)
  })
}

function ensureCols(
  table: HTMLTableElement,
  count: number
): HTMLTableColElement[] {
  let group = table.querySelector(":scope > colgroup")
  if (!(group instanceof HTMLTableColElement)) {
    group = document.createElement("colgroup")
    table.prepend(group)
  }
  while (group.children.length < count)
    group.append(document.createElement("col"))
  while (group.children.length > count) group.lastElementChild?.remove()
  const cols: HTMLTableColElement[] = []
  for (const child of group.children)
    if (child instanceof HTMLTableColElement) cols.push(child)
  return cols
}

/** The resting divider sits on every edge but the table's own: the last
 *  visible column's handle only shows its line while hovered or dragged. */
function markResizeEdges(headers: readonly HTMLTableCellElement[]): void {
  let last = -1
  for (let index = 0; index < headers.length; index++) {
    const header = headers[index]
    if (header !== undefined && !header.hidden) last = index
  }
  for (let index = 0; index < headers.length; index++) {
    const header = headers[index]
    if (header === undefined) continue
    const handle = header.querySelector(".doc-table-resize")
    if (!(handle instanceof HTMLElement)) continue
    if (index === last) delete handle.dataset.edge
    else handle.dataset.edge = ""
  }
}

/**
 * Writes `widths` onto the table (`null` returns it to automatic columns).
 * Every column gets the width it was given, and the table is exactly that
 * wide, so a later layout pass does not spread leftover space over them.
 */
export function applyColumnWidths(
  table: HTMLTableElement,
  headers: readonly HTMLTableCellElement[],
  widths: readonly number[] | null
): void {
  markResizeEdges(headers)
  if (widths === null) {
    table.querySelector(":scope > colgroup")?.remove()
    table.style.tableLayout = ""
    table.style.width = ""
    table.style.minWidth = ""
    return
  }
  const layout = columnLayout(widths, hiddenOf(headers))
  const cols = ensureCols(table, layout.columnWidths.length)
  for (let index = 0; index < layout.columnWidths.length; index++) {
    const col = cols[index]
    const width = layout.columnWidths[index]
    if (col === undefined || width === undefined) continue
    col.style.width = width
  }
  table.style.tableLayout = "fixed"
  table.style.width = `${layout.tableWidth}px`
  table.style.minWidth = `${layout.tableWidth}px`
  for (let index = 0; index < headers.length; index++) {
    const header = headers[index]
    const width = widths[index]
    if (header === undefined || width === undefined) continue
    const handle = header.querySelector(".doc-table-resize")
    if (!(handle instanceof HTMLElement)) continue
    handle.setAttribute("aria-valuenow", String(width))
    handle.setAttribute("aria-valuemin", String(MIN_COLUMN_WIDTH))
  }
}

function remember(
  table: HTMLTableElement,
  headers: readonly HTMLTableCellElement[],
  widths: number[]
): void {
  widthsOf.set(table, widths)
  applyColumnWidths(table, headers, widths)
}

function widthsFor(
  table: HTMLTableElement,
  headers: readonly HTMLTableCellElement[]
): number[] {
  const existing = widthsOf.get(table)
  if (existing !== undefined) return existing
  const measured = measuredWidths(headers)
  widthsOf.set(table, measured)
  return measured
}

function resizeBy(
  table: HTMLTableElement,
  headers: readonly HTMLTableCellElement[],
  index: number,
  delta: number,
  origin: readonly number[]
): void {
  remember(
    table,
    headers,
    widthsAfterResize(origin, hiddenOf(headers), index, delta)
  )
}

/** Re-applies the reader's widths after a view change (a hidden column
 *  must take no space). Automatic layout is left untouched. */
export function syncColumnWidths(
  table: HTMLTableElement,
  headers: readonly HTMLTableCellElement[]
): void {
  const widths = widthsOf.get(table)
  if (widths === undefined) {
    markResizeEdges(headers)
    return
  }
  applyColumnWidths(table, headers, widths)
}

function clearWidths(
  table: HTMLTableElement,
  headers: readonly HTMLTableCellElement[]
): void {
  widthsOf.delete(table)
  applyColumnWidths(table, headers, null)
}

/**
 * Drag, arrow keys and double-click on the header handles `prepareHeader`
 * added. Widths live on the table element, so a later view keeps them.
 */
export function bindColumnResize(
  table: HTMLTableElement,
  headers: readonly HTMLTableCellElement[]
): void {
  headers.forEach((header, index) => {
    const handle = header.querySelector(".doc-table-resize")
    if (!(handle instanceof HTMLElement)) return
    bindHandle(table, headers, header, handle, index)
  })
  markResizeEdges(headers)
}

function bindHandle(
  table: HTMLTableElement,
  headers: readonly HTMLTableCellElement[],
  header: HTMLTableCellElement,
  handle: HTMLElement,
  index: number
): void {
  let origin: number[] | null = null
  let originX = 0
  let pointerId = -1

  const endDrag = () => {
    origin = null
    delete handle.dataset.resizing
    delete table.dataset.colResize
  }

  handle.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    origin = widthsFor(table, headers)
    originX = event.clientX
    pointerId = event.pointerId
    handle.dataset.resizing = ""
    table.dataset.colResize = ""
    handle.setPointerCapture(event.pointerId)
  })

  handle.addEventListener("pointermove", (event) => {
    if (origin === null || event.pointerId !== pointerId) return
    resizeBy(table, headers, index, event.clientX - originX, origin)
  })

  handle.addEventListener("pointerup", (event) => {
    if (event.pointerId !== pointerId) return
    endDrag()
  })

  handle.addEventListener("pointercancel", endDrag)

  handle.addEventListener("dblclick", (event) => {
    event.preventDefault()
    event.stopPropagation()
    clearWidths(table, headers)
  })

  handle.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return
    event.preventDefault()
    const step = event.key === "ArrowLeft" ? -RESIZE_STEP_PX : RESIZE_STEP_PX
    const current = widthsFor(table, headers)
    resizeBy(table, headers, index, step, current)
  })

  // A press on the handle must not start a text selection in the header.
  header.addEventListener("selectstart", (event) => {
    if (origin !== null) event.preventDefault()
  })
}
