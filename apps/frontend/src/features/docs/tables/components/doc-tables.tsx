import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { createPortal } from "react-dom"
import { DataTableColumnFilter } from "@/components/shared/data-display/data-table-column-filter"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import {
  DocTableEmpty,
  DocTablePager,
} from "@/features/docs/tables/components/doc-table-foot"
import { DocTableToolbar } from "@/features/docs/tables/components/doc-table-toolbar"
import { useDocTable } from "@/features/docs/tables/hooks/use-doc-table"
import {
  type DocTableState,
  facetOptions,
  hiddenColumns,
  initialState,
  isFiltered,
  keptValues,
  type TableChip,
  tableChips,
  termsCache,
  withoutFilters,
} from "@/features/docs/tables/model/doc-table"
import {
  applyView,
  type DomTable,
  prepareTables,
  viewCells,
} from "@/features/docs/tables/model/table-dom"
import {
  download,
  exportName,
  toCsv,
  toMarkdownTable,
} from "@/features/docs/tables/model/table-export"
import {
  stateFromSearch,
  viewHref,
} from "@/features/docs/tables/model/table-url"
import {
  PAGE_SIZE,
  pageLabel,
  rowsLabel,
} from "@/features/docs/tables/model/table-view"

// The tables of a documentation page, made interactive over the server's
// HTML. Each one is a TanStack table (`useDocTable`) whose rows are the
// server's `tr` elements, sorted, filtered and paged in place
// (`table-dom.ts`); the controls are React from the design system, rendered
// through portals into the slots `prepareTables` leaves. Mounted once per
// page in `doc-body.astro`.

/** The state a table opens with: the view its address names, or the first. */
function openingState(dom: DomTable): {
  state: DocTableState
  restored: boolean
} {
  const base = initialState(dom.model)
  const restored = stateFromSearch(
    window.location.search,
    dom.id,
    dom.model,
    base
  )
  if (restored === null) return { state: base, restored: false }
  return { state: restored, restored: true }
}

function withoutChip(state: DocTableState, chip: TableChip): DocTableState {
  if (chip.kind === "query")
    return {
      ...state,
      globalFilter: "",
      pagination: { ...state.pagination, pageIndex: 0 },
    }
  return {
    ...state,
    columnFilters: state.columnFilters.filter(
      (filter) => filter.id !== chip.column
    ),
    pagination: { ...state.pagination, pageIndex: 0 },
  }
}

/** The values kept, or no filter at all when none is. */
function filterValueOf(kept: string[]): string[] | undefined {
  if (kept.length === 0) return undefined
  return kept
}

function pageTitle(): string {
  return document.querySelector("main h1")?.textContent?.trim() ?? ""
}

/**
 * Full screen: the table's box moves into a dialog while it is open and
 * back to its place before the dialog closes, so nothing of it is lost.
 */
function useFullscreen(box: HTMLElement) {
  const [open, setOpen] = useState(false)
  const placeholder = useRef<Comment | null>(null)

  const restore = useCallback(() => {
    const marker = placeholder.current
    if (marker === null) return
    marker.replaceWith(box)
    placeholder.current = null
    box.scrollIntoView({ block: "nearest" })
  }, [box])

  const hold = useCallback(
    (node: HTMLDivElement | null) => {
      if (node === null || placeholder.current !== null) return
      const marker = document.createComment("tabla")
      box.before(marker)
      placeholder.current = marker
      node.append(box)
    },
    [box]
  )

  const change = useCallback(
    (next: boolean) => {
      if (!next) restore()
      setOpen(next)
    },
    [restore]
  )

  useEffect(() => restore, [restore])
  return { open, change, hold }
}

function DocTable({ dom }: { dom: DomTable }) {
  const { model } = dom
  const [opening] = useState(() => openingState(dom))
  const { table, state, setState } = useDocTable(model, opening.state)
  const terms = useMemo(() => termsCache(model), [model])
  const fullscreen = useFullscreen(dom.box)

  const hidden = hiddenColumns(state)
  const page = table.getRowModel().rows.map((row) => row.original)
  const filtered = table
    .getPrePaginatedRowModel()
    .rows.map((row) => row.original)
  const pageCount = table.getPageCount()

  useLayoutEffect(() => {
    applyView(dom, {
      hidden,
      sorting: state.sorting,
      page,
      filteredCount: filtered.length,
      terms: terms(state.globalFilter),
    })
  })

  // The headers are the server's: their sort buttons toggle TanStack's sort,
  // adding the column with Shift.
  useEffect(() => {
    const removers = dom.sortButtons.map((button, index) => {
      const onClick = (event: MouseEvent) => {
        const id = model.columns[index]?.id
        if (id === undefined) return
        table.getColumn(id)?.toggleSorting(undefined, event.shiftKey)
      }
      button.addEventListener("click", onClick)
      return () => button.removeEventListener("click", onClick)
    })
    return () => {
      for (const remove of removers) remove()
    }
  }, [dom, model, table])

  useEffect(() => {
    if (opening.restored) dom.box.scrollIntoView({ block: "start" })
  }, [dom, opening])

  if (!model.full) return null

  const cells = () => viewCells(dom, hidden, filtered, window.location.origin)
  const showPager =
    model.paged &&
    (filtered.length > PAGE_SIZE || state.pagination.pageSize !== PAGE_SIZE)

  return (
    <>
      {createPortal(
        <DocTableToolbar
          query={state.globalFilter}
          onQueryChange={(query) => table.setGlobalFilter(query)}
          count={rowsLabel(
            filtered.length,
            model.rows.length,
            isFiltered(state)
          )}
          columns={model.columns}
          hidden={hidden}
          onToggleColumn={(column, shown) =>
            table.getColumn(column)?.toggleVisibility(shown)
          }
          chips={tableChips(model, state)}
          onRemoveChip={(chip) =>
            setState((current) => withoutChip(current, chip))
          }
          onClearFilters={() => setState(withoutFilters)}
          markdown={() => {
            const { headers, markdown } = cells()
            return toMarkdownTable(headers, markdown)
          }}
          viewLink={() =>
            viewHref(
              window.location.href,
              dom.id,
              model,
              state,
              initialState(model).pagination.pageSize
            )
          }
          onDownload={() => {
            const { headers, text } = cells()
            download(
              `${exportName(pageTitle(), dom.heading)}.csv`,
              toCsv(headers, text),
              "text/csv;charset=utf-8"
            )
          }}
          fullscreen={fullscreen.open}
          onFullscreen={() => fullscreen.change(!fullscreen.open)}
        />,
        dom.tools
      )}
      {model.columns.map((column) => {
        const slot = dom.filterSlots[column.index]
        const tanstack = table.getColumn(column.id)
        if (slot === undefined || tanstack === undefined) return null
        const kept = keptValues(tanstack.getFilterValue())
        return createPortal(
          <DataTableColumnFilter
            label={column.header}
            placement="header"
            filter={{
              options: facetOptions(
                model,
                column.index,
                tanstack.getFacetedUniqueValues(),
                kept
              ),
              selected: kept,
              onChange: (next) => tanstack.setFilterValue(filterValueOf(next)),
            }}
            sort={{
              direction: tanstack.getIsSorted(),
              onSort: (desc) => table.setSorting([{ id: column.id, desc }]),
            }}
          />,
          slot,
          column.id
        )
      })}
      {createPortal(
        <>
          {filtered.length === 0 ? (
            <DocTableEmpty onClear={() => setState(withoutFilters)} />
          ) : null}
          {showPager ? (
            <DocTablePager
              pageIndex={state.pagination.pageIndex}
              pageCount={pageCount}
              pageSize={state.pagination.pageSize}
              total={model.rows.length}
              label={pageLabel(state.pagination.pageIndex, pageCount)}
              onPage={(pageIndex) => table.setPageIndex(pageIndex)}
              onPageSize={(pageSize) => {
                table.setPageSize(pageSize)
                table.setPageIndex(0)
              }}
            />
          ) : null}
        </>,
        dom.foot
      )}
      <Dialog open={fullscreen.open} onOpenChange={fullscreen.change}>
        <DialogContent
          showCloseButton={false}
          className="flex h-[calc(100dvh-2rem)] max-w-[calc(100vw-2rem)] flex-col overflow-auto p-4 sm:max-w-[calc(100vw-2rem)]"
        >
          <DialogTitle className="sr-only">
            Tabla a pantalla completa
          </DialogTitle>
          <div ref={fullscreen.hold} className="typeset typeset-docs doc" />
        </DialogContent>
      </Dialog>
    </>
  )
}

/** Every table of the page's body, each with its own state and controls. */
export function DocTables() {
  const [tables, setTables] = useState<DomTable[]>([])
  useEffect(() => {
    setTables(prepareTables(document))
  }, [])
  return (
    <>
      {tables.map((dom) => (
        <DocTable key={dom.id} dom={dom} />
      ))}
    </>
  )
}
