import type { SortingState } from "@tanstack/react-table"
import { cellMarkdown } from "@/features/docs/page/model/table-export"
import type { QueryTerm } from "@/features/docs/page/model/table-query"
import {
  bindColumnResize,
  MIN_COLUMN_WIDTH,
  syncColumnWidths,
} from "@/features/docs/page/model/table-resize"
import { tableId } from "@/features/docs/page/model/table-url"
import {
  type TableModel,
  type TableRow,
  tableModel,
} from "@/features/docs/page/model/table-view"
import { foldText } from "@/lib/fold-text"

// The server's table, made ready for the island and kept in step with its
// view. The rows stay the server's `tr` elements: the island only moves,
// hides and marks them. Every header's content moves into a sort button,
// and a full table gets a slot per header for its filter, at the end of the
// header. Every header gets a resize handle on its trailing edge. Containers
// before and after the frame hold the toolbar and the pager, all inside one
// box that the full-screen dialog can take.

/** Frames of the page's tables, except key/value ones and done ones. */
const FRAMES = ".doc .doc-table:not([data-table-kv], [data-table-ready])"

export interface DomTable {
  /** The table's id in the page (`stacks-1`), for links to a view of it. */
  id: string
  /** The text of the heading it is under, for file names. */
  heading: string | null
  frame: HTMLElement
  table: HTMLTableElement
  tbody: HTMLTableSectionElement
  headers: HTMLTableCellElement[]
  sortButtons: HTMLButtonElement[]
  /** Where each header's filter goes; empty for a table without toolbar. */
  filterSlots: HTMLElement[]
  rows: HTMLTableRowElement[]
  /** The toolbar, the frame and the pager, together. */
  box: HTMLElement
  tools: HTMLElement
  foot: HTMLElement
  model: TableModel
}

function textOf(node: Node | undefined): string {
  return node?.textContent ?? ""
}

/** The cells of a row, in order. */
function cellsOf(row: Element): HTMLTableCellElement[] {
  const cells: HTMLTableCellElement[] = []
  for (const child of row.children)
    if (child instanceof HTMLTableCellElement) cells.push(child)
  return cells
}

function rowsOf(section: Element): HTMLTableRowElement[] {
  const rows: HTMLTableRowElement[] = []
  for (const child of section.children)
    if (child instanceof HTMLTableRowElement) rows.push(child)
  return rows
}

function headingsOf(root: ParentNode): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(".doc :is(h2[id], h3[id])")]
}

/** The last heading before `frame` in the document, if any. */
function headingAbove(
  frame: HTMLElement,
  headings: readonly HTMLElement[]
): HTMLElement | null {
  let found: HTMLElement | null = null
  for (const heading of headings) {
    const position = heading.compareDocumentPosition(frame)
    if (position & Node.DOCUMENT_POSITION_FOLLOWING) found = heading
  }
  return found
}

function element(tagName: string, className: string): HTMLElement {
  const created = document.createElement(tagName)
  created.className = className
  return created
}

/** The header's content moved into a button that sorts by its column. */
function sortButton(header: HTMLTableCellElement): HTMLButtonElement {
  const button = document.createElement("button")
  button.type = "button"
  button.className = "doc-table-sort"
  button.append(...header.childNodes)
  const indicator = element("span", "doc-table-sort-icon")
  indicator.setAttribute("aria-hidden", "true")
  button.append(indicator)
  return button
}

function headerLabel(button: HTMLButtonElement): string {
  const text = button.textContent
  if (text === null) return "columna"
  const trimmed = text.trim()
  if (trimmed === "") return "columna"
  return trimmed
}

/** Drag handle on the header's trailing edge. */
function resizeHandle(label: string): HTMLElement {
  const handle = element("div", "doc-table-resize")
  handle.setAttribute("role", "separator")
  handle.tabIndex = 0
  handle.setAttribute("aria-orientation", "vertical")
  handle.setAttribute("aria-label", `Redimensionar ${label}`)
  handle.setAttribute("aria-valuemin", String(MIN_COLUMN_WIDTH))
  return handle
}

function prepareHeader(
  header: HTMLTableCellElement,
  withFilter: boolean
): { button: HTMLButtonElement; slot: HTMLElement | null } {
  const button = sortButton(header)
  const wrap = element("span", "doc-table-th")
  wrap.append(button)
  let slot: HTMLElement | null = null
  if (withFilter) {
    slot = element("span", "doc-table-filter")
    wrap.append(slot)
  }
  header.replaceChildren(wrap, resizeHandle(headerLabel(button)))
  return { button, slot }
}

function prepare(
  frame: HTMLElement,
  id: string,
  heading: string | null
): DomTable | null {
  const headerRow = frame.querySelector("table > thead > tr")
  const tbody = frame.querySelector("table > tbody")
  if (headerRow === null || !(tbody instanceof HTMLTableSectionElement))
    return null
  const table = tbody.parentElement
  if (!(table instanceof HTMLTableElement)) return null
  const rows = rowsOf(tbody)
  if (rows.length === 0) return null
  const headers = cellsOf(headerRow)
  const model = tableModel(
    headers.map((header) => textOf(header)),
    rows.map((row) => {
      const cells = cellsOf(row)
      return headers.map((_, index) => textOf(cells[index]))
    })
  )

  frame.dataset.tableReady = ""
  const sortButtons: HTMLButtonElement[] = []
  const filterSlots: HTMLElement[] = []
  for (const [index, header] of headers.entries()) {
    const column = model.columns[index]
    const withFilter = model.full && column?.filterable === true
    const { button, slot } = prepareHeader(header, withFilter)
    sortButtons.push(button)
    if (slot !== null) filterSlots[index] = slot
  }
  bindColumnResize(table, headers)

  const box = element("div", "doc-table-box")
  box.id = id
  const tools = element("div", "doc-table-tools")
  const foot = element("div", "doc-table-foot")
  for (const part of [tools, foot]) part.dataset.mdSkip = ""
  frame.before(box)
  box.append(tools, frame, foot)
  return {
    id,
    heading,
    frame,
    table,
    tbody,
    headers,
    sortButtons,
    filterSlots,
    rows,
    box,
    tools,
    foot,
    model,
  }
}

/**
 * Prepares every interactive table of `root`, in document order, each with
 * its id: the heading it is under and its place there (`stacks-1`).
 */
export function prepareTables(root: ParentNode): DomTable[] {
  const headings = headingsOf(root)
  const perHeading = new Map<string, number>()
  const prepared: DomTable[] = []
  for (const frame of root.querySelectorAll<HTMLElement>(FRAMES)) {
    const heading = headingAbove(frame, headings)
    const key = heading?.id ?? ""
    const n = (perHeading.get(key) ?? 0) + 1
    perHeading.set(key, n)
    const headingText = heading === null ? null : textOf(heading).trim()
    const dom = prepare(frame, tableId(heading?.id ?? null, n), headingText)
    if (dom !== null) prepared.push(dom)
  }
  return prepared
}

function ariaSort(desc: boolean | null): string {
  if (desc === null) return "none"
  if (desc) return "descending"
  return "ascending"
}

/** Puts `view` on the server's table: row order, hidden columns, sort marks. */
/** What TanStack Table gives the server's table to show. */
export interface DomView {
  /** Ids of the hidden columns. */
  hidden: readonly string[]
  sorting: SortingState
  /** The rows of the current page, in order. */
  page: readonly TableRow[]
  /** How many rows pass the filters, every page included. */
  filteredCount: number
  /** The box's terms, highlighted in the cells. */
  terms: readonly QueryTerm[]
}

export function applyView(dom: DomTable, view: DomView): void {
  const { model } = dom
  const { sorting, terms } = view
  for (const column of model.columns) {
    const hidden = view.hidden.includes(column.id)
    const header = dom.headers[column.index]
    if (header !== undefined && header.hidden !== hidden) {
      header.hidden = hidden
      for (const row of dom.rows) {
        const cell = cellsOf(row)[column.index]
        if (cell !== undefined) cell.hidden = hidden
      }
    }
    const at = sorting.findIndex((sort) => sort.id === column.id)
    const sort = sorting[at]
    header?.setAttribute("aria-sort", ariaSort(sort?.desc ?? null))
    // The place in a sort by several columns, shown by CSS from the attribute.
    const button = dom.sortButtons[column.index]
    if (button === undefined) continue
    if (sort !== undefined && sorting.length > 1)
      button.dataset.sortIndex = String(at + 1)
    else delete button.dataset.sortIndex
  }

  for (const row of dom.rows) unmark(row)
  const shown = view.page.map((row) => dom.rows[row.index])
  dom.tbody.replaceChildren(...shown.filter((row) => row !== undefined))
  const visible = model.columns
    .filter((column) => !view.hidden.includes(column.id))
    .map((column) => column.index)
  for (const row of view.page) {
    const tr = dom.rows[row.index]
    if (tr === undefined) continue
    for (const index of visible) {
      const words = terms
        .filter((term) => term.column === null || term.column === index)
        .map((term) => term.value)
        .filter((word) => row.folded[index]?.includes(word))
      const cell = cellsOf(tr)[index]
      if (cell !== undefined && words.length > 0) markIn(cell, words)
    }
  }
  dom.frame.toggleAttribute("data-empty", view.filteredCount === 0)
  syncColumnWidths(dom.table, dom.headers)
}

/**
 * The view to take out of the page: the visible columns' headers and, for
 * every filtered row (every page), its texts and its cells as Markdown.
 */
export function viewCells(
  dom: DomTable,
  hidden: readonly string[],
  filtered: readonly TableRow[],
  origin: string
): { headers: string[]; text: string[][]; markdown: string[][] } {
  const columns = dom.model.columns.filter(
    (column) => !hidden.includes(column.id)
  )
  const text: string[][] = []
  const markdown: string[][] = []
  for (const row of filtered) {
    const tr = dom.rows[row.index]
    const cells = tr === undefined ? [] : cellsOf(tr)
    text.push(columns.map((column) => row.text[column.index] ?? ""))
    markdown.push(
      columns.map((column) => {
        const cell = cells[column.index]
        if (cell === undefined) return ""
        return cellMarkdown(cell, origin)
      })
    )
  }
  return { headers: columns.map((column) => column.header), text, markdown }
}

/** Removes the highlights of an earlier view. */
export function unmark(root: HTMLElement): void {
  for (const mark of root.querySelectorAll("mark[data-table-mark]")) {
    const parent = mark.parentNode
    mark.replaceWith(...mark.childNodes)
    parent?.normalize()
  }
}

function rangesOf(
  folded: string,
  words: readonly string[]
): [number, number][] {
  const ranges: [number, number][] = []
  for (const word of words)
    for (
      let at = folded.indexOf(word);
      at >= 0;
      at = folded.indexOf(word, at + 1)
    )
      ranges.push([at, at + word.length])
  ranges.sort((a, b) => a[0] - b[0])
  const merged: [number, number][] = []
  for (const range of ranges) {
    const last = merged.at(-1)
    if (last !== undefined && range[0] <= last[1])
      last[1] = Math.max(last[1], range[1])
    else merged.push([range[0], range[1]])
  }
  return merged
}

/**
 * Wraps in `<mark>` the `words` found in the text of `cell`. Folding keeps
 * the length of accented text, so a position in the folded text is one in
 * the original; a text node where it doesn't is left alone.
 */
export function markIn(cell: HTMLElement, words: readonly string[]): void {
  const walker = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT)
  const nodes: Text[] = []
  for (let node = walker.nextNode(); node !== null; node = walker.nextNode())
    if (node instanceof Text) nodes.push(node)
  for (const node of nodes) {
    const folded = foldText(node.data)
    if (folded.length !== node.data.length) continue
    const ranges = rangesOf(folded, words)
    if (ranges.length === 0) continue
    const parts: Node[] = []
    let from = 0
    for (const [start, end] of ranges) {
      if (start > from)
        parts.push(document.createTextNode(node.data.slice(from, start)))
      const mark = document.createElement("mark")
      mark.dataset.tableMark = ""
      mark.textContent = node.data.slice(start, end)
      parts.push(mark)
      from = end
    }
    if (from < node.data.length)
      parts.push(document.createTextNode(node.data.slice(from)))
    node.replaceWith(...parts)
  }
}
