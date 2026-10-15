import {
  nextSort,
  rowsLabel,
  SEARCHABLE_ROWS,
  type TableRow,
  type TableSort,
  visibleRows,
} from "@/features/docs/page/model/table-view"

// The tables of a documentation page made interactive in the browser: every
// header sorts its column, and a long table gets a search box with a count
// over it. Key/value tables stay as they are. Rendered by
// `render.ts` as `.doc-table`; styled in `global.css`.

const TABLES = ".doc .doc-table:not([data-table-kv], [data-table-ready])"

interface DomRow extends TableRow {
  element: HTMLTableRowElement
}

function rowsOf(body: HTMLTableSectionElement): DomRow[] {
  return [...body.rows].map((element) => ({
    element,
    cells: [...element.cells].map((cell) => cell.textContent ?? ""),
  }))
}

function ariaSort(sort: TableSort | null, column: number): string {
  if (sort === null || sort.column !== column) return "none"
  if (sort.desc) return "descending"
  return "ascending"
}

/** The header's content moved into a button that sorts by its column. */
function sortButton(header: HTMLTableCellElement): HTMLButtonElement {
  const button = document.createElement("button")
  button.type = "button"
  button.className = "doc-table-sort"
  button.append(...header.childNodes)
  const indicator = document.createElement("span")
  indicator.className = "doc-table-sort-icon"
  indicator.setAttribute("aria-hidden", "true")
  button.append(indicator)
  header.append(button)
  return button
}

function searchBar(): {
  bar: HTMLElement
  input: HTMLInputElement
  count: HTMLElement
} {
  const bar = document.createElement("div")
  bar.className = "doc-table-bar"
  bar.dataset.mdSkip = ""
  const input = document.createElement("input")
  input.type = "search"
  input.placeholder = "Buscar en la tabla"
  input.setAttribute("aria-label", "Buscar en la tabla")
  input.className = "doc-table-search"
  const count = document.createElement("span")
  count.className = "doc-table-count"
  count.setAttribute("aria-live", "polite")
  bar.append(input, count)
  return { bar, input, count }
}

function mountTable(frame: HTMLElement) {
  const table = frame.querySelector("table")
  const head = table?.tHead
  const body = table?.tBodies[0]
  if (head === null || head === undefined || body === undefined) return
  const headerRow = head.rows[0]
  if (headerRow === undefined) return
  frame.dataset.tableReady = ""

  const rows = rowsOf(body)
  const headers = [...headerRow.cells]
  let sort: TableSort | null = null
  let query = ""
  let count: HTMLElement | null = null

  const render = () => {
    const shown = visibleRows(rows, query, sort)
    const visible = new Set(shown)
    for (const row of rows) row.element.hidden = !visible.has(row)
    body.append(...shown.map((row) => row.element))
    headers.forEach((header, column) => {
      header.setAttribute("aria-sort", ariaSort(sort, column))
    })
    frame.toggleAttribute("data-empty", shown.length === 0)
    if (count !== null) count.textContent = rowsLabel(shown.length, rows.length)
  }

  headers.forEach((header, column) => {
    sortButton(header).addEventListener("click", () => {
      sort = nextSort(sort, column)
      render()
    })
  })

  if (rows.length >= SEARCHABLE_ROWS) {
    const search = searchBar()
    count = search.count
    search.input.addEventListener("input", () => {
      query = search.input.value
      render()
    })
    frame.before(search.bar)
  }
  render()
}

/** Makes the tables of the page shown now interactive; done ones are kept. */
export function mountTables() {
  for (const frame of document.querySelectorAll<HTMLElement>(TABLES))
    mountTable(frame)
}
