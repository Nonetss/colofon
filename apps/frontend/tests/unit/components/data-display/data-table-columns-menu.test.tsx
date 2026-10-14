import { afterEach, describe, expect, test } from "bun:test"
import { createColumnHelper } from "@tanstack/react-table"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { DataTableColumnsMenu } from "@/components/shared/data-display/data-table-columns-menu"
import { useColumnPreferences } from "@/hooks/use-column-preferences"
import {
  columnLayoutOf,
  type DataTableFeatures,
  useDataTable,
} from "@/hooks/use-data-table"

type Host = { id: string; ip: string; name: string; vlan: number }

const helper = createColumnHelper<DataTableFeatures, Host>()
const columns = helper.columns([
  helper.accessor("ip", {
    id: "ip",
    header: "IP",
    meta: { label: "IP", reorderable: false },
  }),
  helper.accessor("name", {
    id: "name",
    header: "Nombre",
    enableHiding: true,
    meta: { label: "Nombre", reorderable: true },
  }),
  helper.accessor("vlan", {
    id: "vlan",
    header: "VLAN",
    enableHiding: true,
    meta: { label: "VLAN", reorderable: true, defaultHidden: true },
  }),
])
const layout = columnLayoutOf(columns)
const rows: Host[] = []

const NONE: readonly string[] = []

function Harness({ forced = NONE }: { forced?: readonly string[] }) {
  const preferences = useColumnPreferences("menu-test", layout)
  const table = useDataTable({
    data: rows,
    columns,
    getRowId: (row) => row.id,
    sorting: [],
    onSortingChange: () => {},
    columnVisibility: preferences.visibility,
    onColumnVisibilityChange: preferences.setVisibility,
    columnOrder: preferences.order,
    onColumnOrderChange: preferences.setOrder,
    columnSizing: preferences.sizing,
    onColumnSizingChange: preferences.setSizing,
    forcedHidden: forced,
  })
  return (
    <>
      <output data-testid="order">{preferences.order.join(",")}</output>
      <output data-testid="saved-name">
        {String(preferences.visibility.name)}
      </output>
      <output data-testid="shown">
        {table
          .getVisibleLeafColumns()
          .map((column) => column.id)
          .join(",")}
      </output>
      <DataTableColumnsMenu
        table={table}
        onReset={preferences.reset}
        hiddenColumnIds={forced}
      />
    </>
  )
}

function open(forced?: readonly string[]) {
  render(<Harness forced={forced} />)
  fireEvent.click(screen.getByRole("button", { name: "Columnas" }))
}

afterEach(() => {
  cleanup()
  window.localStorage.clear()
})

describe("DataTableColumnsMenu", () => {
  test("a fixed column has no grip and is always shown", () => {
    open()
    expect(screen.queryByRole("button", { name: /^Mover IP/ })).toBeNull()
    expect(screen.getByText("Siempre visible")).toBeDefined()
  })

  test("a default-hidden column is listed unchecked", () => {
    open()
    const vlan = screen.getByRole("checkbox", { name: "VLAN" })
    expect(vlan.getAttribute("aria-checked")).toBe("false")
  })

  test("arrow keys on a grip move its column", () => {
    open()
    const grip = screen.getByRole("button", { name: /^Mover Nombre/ })
    fireEvent.keyDown(grip, { key: "ArrowDown" })
    expect(screen.getByTestId("order").textContent).toBe("ip,vlan,name")
    fireEvent.keyDown(screen.getByRole("button", { name: /^Mover Nombre/ }), {
      key: "ArrowUp",
    })
    expect(screen.getByTestId("order").textContent).toBe("ip,name,vlan")
  })

  test("a move never passes a fixed column", () => {
    open()
    fireEvent.keyDown(screen.getByRole("button", { name: /^Mover Nombre/ }), {
      key: "ArrowUp",
    })
    expect(screen.getByTestId("order").textContent).toBe("ip,name,vlan")
  })

  test("a forced-hidden column is neither shown nor listed", () => {
    open(["name"])
    expect(screen.getByTestId("shown").textContent).toBe("ip")
    expect(screen.queryByRole("checkbox", { name: "Nombre" })).toBeNull()
  })

  test("toggling another column never saves the forced value", () => {
    open(["name"])
    fireEvent.click(screen.getByRole("checkbox", { name: "VLAN" }))
    expect(screen.getByTestId("shown").textContent).toBe("ip,vlan")
    expect(screen.getByTestId("saved-name").textContent).toBe("true")
  })
})
