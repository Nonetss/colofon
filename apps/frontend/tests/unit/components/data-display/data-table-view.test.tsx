import { afterEach, describe, expect, mock, test } from "bun:test"
import { createColumnHelper, type SortingState } from "@tanstack/react-table"
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react"
import { useState } from "react"
import {
  DATA_TABLE_EXPAND_COLUMN,
  type DataTableMobileFilters,
  DataTableView,
} from "@/components/shared/data-display/data-table-view"
import { useColumnPreferences } from "@/hooks/use-column-preferences"
import {
  columnLayoutOf,
  columnPreferenceProps,
  type DataTableFeatures,
  useDataTable,
} from "@/hooks/use-data-table"

type Job = { id: string; name: string; tag: string; owner: string }

const helper = createColumnHelper<DataTableFeatures, Job>()

const plainColumns = helper.columns([
  helper.accessor("name", {
    id: "name",
    header: "Nombre",
    enableSorting: true,
    meta: { label: "Nombre", reorderable: false, compact: "primary" },
  }),
  helper.accessor("tag", {
    id: "tag",
    header: "Etiqueta",
    meta: { label: "Etiqueta", reorderable: true },
  }),
  helper.display({
    id: "actions",
    header: "Acciones",
    enableResizing: false,
    meta: { label: "Acciones", reorderable: false },
  }),
])

const hiddenColumns = helper.columns([
  helper.accessor("name", {
    id: "name",
    header: "Nombre",
    meta: { label: "Nombre", reorderable: false, compact: "primary" },
  }),
  helper.accessor("owner", {
    id: "owner",
    header: "Propietario",
    enableHiding: true,
    meta: { label: "Propietario", reorderable: true, defaultHidden: true },
  }),
  helper.display({
    id: DATA_TABLE_EXPAND_COLUMN,
    header: "Detalle",
    enableResizing: false,
    meta: { label: "Detalle", reorderable: false },
  }),
])

const plainLayout = columnLayoutOf(plainColumns)
const hiddenLayout = columnLayoutOf(hiddenColumns)

const jobs: Job[] = [
  { id: "a", name: "Backup", tag: "noche", owner: "Ana" },
  { id: "b", name: "Limpieza", tag: "noche", owner: "Luis" },
  { id: "c", name: "Informe", tag: "día", owner: "Eva" },
]

const NONE: readonly string[] = []

function PlainTable({
  layout,
  forced = NONE,
  rows = jobs,
  nameFilter = NONE,
  onNameFilter = () => {},
  mobileFilters,
}: {
  layout?: "responsive" | "table"
  forced?: readonly string[]
  rows?: Job[]
  nameFilter?: readonly string[]
  onNameFilter?: (next: string[]) => void
  mobileFilters?: DataTableMobileFilters
}) {
  const preferences = useColumnPreferences("view-plain", plainLayout)
  const [sorting, setSorting] = useState<SortingState>([])
  const table = useDataTable({
    data: rows,
    columns: plainColumns,
    getRowId: (job) => job.id,
    sorting,
    onSortingChange: setSorting,
    forcedHidden: forced,
    ...columnPreferenceProps(preferences),
  })
  return (
    <DataTableView
      table={table}
      label="Trabajos"
      idPrefix="jobs"
      layout={layout}
      hiddenColumnIds={forced}
      onResetColumns={preferences.reset}
      renderControl={(job) => <button type="button">Editar {job.name}</button>}
      groupOf={(job) => ({ key: job.tag, heading: `Grupo ${job.tag}` })}
      rowState={(job) => ({ muted: job.id === "b" })}
      filters={{
        name: {
          options: rows.map((job) => ({ value: job.name, label: job.name })),
          selected: nameFilter,
          onChange: onNameFilter,
        },
      }}
      mobileFilters={mobileFilters}
      emptyMessage="Ningún trabajo coincide"
    />
  )
}

const DESKTOP_WIDTH = window.innerWidth

/** Sets the window's width: happy-dom matches media queries against it
 *  live, so `useIsMobile` sees it on the next render. `innerWidth` is
 *  read-only in the DOM types; happy-dom's setter is how it resizes. */
function setWindowWidth(width: number) {
  Reflect.set(window, "innerWidth", width)
}

function atPhoneWidth() {
  setWindowWidth(390)
}

function HiddenTable() {
  const preferences = useColumnPreferences("view-hidden", hiddenLayout)
  const table = useDataTable({
    data: jobs,
    columns: hiddenColumns,
    getRowId: (job) => job.id,
    sorting: [],
    onSortingChange: () => {},
    ...columnPreferenceProps(preferences),
  })
  return (
    <DataTableView
      table={table}
      label="Trabajos"
      idPrefix="jobs"
      onResetColumns={preferences.reset}
      renderDetail={(job) => <p>Detalle de {job.name}</p>}
      detailLabel={(job) => `Ver detalle de ${job.name}`}
    />
  )
}

function tableEl() {
  return screen.getByRole("table", { name: "Trabajos" })
}

function compactList() {
  return screen.getByRole("list", { name: "Trabajos" })
}

afterEach(() => {
  cleanup()
  window.localStorage.clear()
})

describe("DataTableView", () => {
  test("the compact rows show a column the table layout hides", () => {
    render(<HiddenTable />)

    expect(tableEl().textContent).not.toContain("Ana")
    expect(compactList().textContent).toContain("Propietario")
    expect(compactList().textContent).toContain("Ana")
  })

  test("offers the columns menu only when some column starts hidden", () => {
    render(<HiddenTable />)
    expect(screen.getByRole("button", { name: "Columnas" })).toBeDefined()
    cleanup()

    render(<PlainTable />)
    expect(screen.queryByRole("button", { name: "Columnas" })).toBeNull()
  })

  test("a heading row starts each group and spans the visible columns", () => {
    render(<PlainTable />)

    const headings = Array.from(tableEl().querySelectorAll("td")).filter(
      (cell) => cell.textContent?.startsWith("Grupo")
    )
    expect(headings.map((cell) => cell.textContent)).toEqual([
      "Grupo noche",
      "Grupo día",
    ])
    expect(headings[0]?.getAttribute("colspan")).toBe("3")
  })

  test("an expanded row's detail spans the visible columns", () => {
    render(<HiddenTable />)

    const [toggle] = screen.getAllByRole("button", {
      name: "Ver detalle de Backup",
    })
    if (!toggle) throw new Error("missing toggle")
    fireEvent.click(toggle)

    const detail = Array.from(tableEl().querySelectorAll("td")).find(
      (cell) => cell.textContent === "Detalle de Backup"
    )
    expect(detail?.getAttribute("colspan")).toBe("2")
    expect(toggle.getAttribute("aria-expanded")).toBe("true")
  })

  test("the table layout has no compact rows", () => {
    render(<PlainTable layout="table" />)

    expect(tableEl()).toBeDefined()
    expect(screen.queryByRole("list", { name: "Trabajos" })).toBeNull()
  })

  test("the first resizable column takes the room left over", () => {
    render(<PlainTable layout="table" />)

    const widths = Array.from(tableEl().querySelectorAll("col")).map(
      (col) => col.style.width
    )
    expect(widths).toEqual(["", "150px", "150px"])
  })

  test("a forced-hidden column is rendered nowhere", () => {
    render(<PlainTable forced={["actions"]} />)

    expect(screen.queryByRole("button", { name: /Editar/ })).toBeNull()
    expect(tableEl().textContent).not.toContain("Acciones")
  })

  test("the compact sort control sorts like the headers", () => {
    render(<PlainTable />)

    const header = screen.getByRole("columnheader", { name: /Nombre/ })
    expect(header.getAttribute("aria-sort")).toBe("none")
    fireEvent.click(within(tableEl()).getByRole("button", { name: "Nombre" }))
    expect(header.getAttribute("aria-sort")).toBe("ascending")
    fireEvent.click(
      screen.getByRole("button", {
        name: "Orden ascendente: cambiar a descendente",
      })
    )
    expect(header.getAttribute("aria-sort")).toBe("descending")
  })

  test("opens a column's value filter from its header", () => {
    const onNameFilter = mock((_next: string[]) => {})
    render(<PlainTable onNameFilter={onNameFilter} />)

    const trigger = within(tableEl()).getByRole("button", {
      name: "Filtrar Nombre",
    })
    expect(trigger.closest("thead")).not.toBeNull()
    fireEvent.click(trigger)
    fireEvent.click(screen.getByRole("checkbox", { name: "Limpieza" }))

    expect(onNameFilter).toHaveBeenCalledWith(["Backup", "Informe"])
  })

  test("names an active filter with how many values it keeps", () => {
    render(<PlainTable nameFilter={["Backup"]} />)

    expect(
      screen.getAllByRole("button", { name: "Filtrar Nombre (1 de 3)" }).length
    ).toBe(2)
  })

  test("keeps the table and its filters when no row is left", () => {
    render(<PlainTable rows={[]} />)

    expect(tableEl().textContent).toContain("Ningún trabajo coincide")
    expect(compactList().textContent).toContain("Ningún trabajo coincide")
    expect(
      screen.getAllByRole("button", { name: "Filtrar Nombre" }).length
    ).toBe(2)
  })

  test("mutes a row's text without dimming the whole row", () => {
    render(<PlainTable />)

    const row = screen
      .getAllByRole("row")
      .find((candidate) => candidate.textContent?.includes("Limpieza"))
    expect(row?.className).toContain("text-muted-foreground")
    expect(row?.className).not.toContain("opacity")
  })

  test("the scroll box holds the table, whose header cells stick to its top", () => {
    let box: HTMLDivElement | null = null
    function Boxed() {
      const preferences = useColumnPreferences("view-boxed", plainLayout)
      const table = useDataTable({
        data: jobs,
        columns: plainColumns,
        getRowId: (job) => job.id,
        sorting: [],
        onSortingChange: () => {},
        ...columnPreferenceProps(preferences),
      })
      return (
        <DataTableView
          table={table}
          label="Trabajos"
          idPrefix="jobs"
          onResetColumns={preferences.reset}
          scrollRef={(element) => {
            box = element
          }}
        />
      )
    }
    render(<Boxed />)

    if (!box) throw new Error("expected the scroll box")
    const scroller: HTMLDivElement = box
    expect(scroller.className).toContain("overflow-auto")
    expect(scroller.contains(tableEl())).toBe(true)
    const header = screen.getByRole("columnheader", { name: /Nombre/ })
    expect(header.className).toContain("sticky")
  })

  describe("mobileFilters", () => {
    afterEach(() => {
      setWindowWidth(DESKTOP_WIDTH)
    })

    test("on a phone moves the column filters into the bottom bar's sheet", () => {
      atPhoneWidth()
      const onClear = mock(() => {})
      render(
        <PlainTable
          nameFilter={["Backup"]}
          mobileFilters={{
            fields: <input aria-label="Filtrar por ruta" />,
            activeCount: 1,
            onClear,
          }}
        />
      )

      // The ordering moved to "Ordenar" beside "Filtros".
      expect(screen.queryByRole("combobox", { name: "Ordenar por" })).toBeNull()
      expect(screen.getByRole("button", { name: "Ordenar" })).toBeDefined()
      // Only the header's filter is left; the one above the compact rows moved.
      expect(
        screen.getAllByRole("button", { name: /^Filtrar Nombre/ })
      ).toHaveLength(1)
      fireEvent.click(screen.getByRole("button", { name: "Filtros · 2" }))

      expect(
        screen.getByRole("textbox", { name: "Filtrar por ruta" })
      ).toBeDefined()
      const sheet = screen.getByRole("dialog")
      expect(
        within(sheet).getByRole("button", { name: /^Filtrar Nombre/ })
      ).toBeDefined()
      fireEvent.click(within(sheet).getByRole("button", { name: "Limpiar" }))
      expect(onClear).toHaveBeenCalledTimes(1)
    })

    test("keeps the filters above the compact rows without it", () => {
      atPhoneWidth()
      render(<PlainTable />)

      expect(screen.queryByRole("button", { name: /^Filtros/ })).toBeNull()
      expect(
        screen.getAllByRole("button", { name: /^Filtrar Nombre/ })
      ).toHaveLength(2)
      expect(
        screen
          .getAllByRole("combobox", { name: "Ordenar por" })
          .map((select) => select.id)
      ).toEqual(["jobs-compact"])
    })

    test("leaves wider screens with the filters above the rows", () => {
      render(<PlainTable mobileFilters={{}} />)

      expect(screen.queryByRole("button", { name: /^Filtros/ })).toBeNull()
    })

    test("on a phone picks the column and direction from the Ordenar sheet", () => {
      atPhoneWidth()
      render(<PlainTable mobileFilters={{}} />)

      fireEvent.click(screen.getByRole("button", { name: "Ordenar" }))
      const sheet = screen.getByRole("dialog")
      const descending = within(sheet).getByRole("button", {
        name: "Descendente",
      })
      // No column yet: the rows keep their order, so no direction applies.
      expect(descending.hasAttribute("disabled")).toBe(true)

      fireEvent.click(within(sheet).getByRole("button", { name: "Nombre" }))
      fireEvent.click(descending)

      expect(
        within(sheet)
          .getByRole("button", { name: "Nombre" })
          .getAttribute("aria-pressed")
      ).toBe("true")
      expect(descending.getAttribute("aria-pressed")).toBe("true")
    })
  })
})
