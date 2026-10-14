import { afterEach, describe, expect, mock, test } from "bun:test"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import {
  DataTableColumnFilter,
  type DataTableFilter,
} from "@/components/shared/data-display/data-table-column-filter"

function remoteFilter(
  overrides: Partial<DataTableFilter> = {}
): DataTableFilter {
  return {
    options: [
      { value: "u1", label: "Ana", detail: "ana@example.com" },
      { value: "u2", label: "Luis", detail: "luis@example.com" },
    ],
    selected: ["u1"],
    onChange: () => {},
    search: { query: "", onQueryChange: () => {}, hint: "Escribe dos letras" },
    ...overrides,
  }
}

function open(filter: DataTableFilter) {
  render(
    <DataTableColumnFilter label="Usuario" filter={filter} placement="header" />
  )
  fireEvent.click(screen.getByRole("button", { name: /^Filtrar Usuario/ }))
}

afterEach(() => {
  cleanup()
})

describe("DataTableColumnFilter with a remote search", () => {
  test("checks only the kept values and offers no select-all", () => {
    open(remoteFilter())

    const ana = screen.getByRole("checkbox", { name: /Ana/ })
    const luis = screen.getByRole("checkbox", { name: /Luis/ })
    expect(ana.getAttribute("aria-checked")).toBe("true")
    expect(luis.getAttribute("aria-checked")).toBe("false")
    expect(screen.queryByText("Seleccionar todo")).toBeNull()
  })

  test("checking a result adds it to the kept values", () => {
    const onChange = mock((_next: string[]) => {})
    open(remoteFilter({ onChange }))

    fireEvent.click(screen.getByRole("checkbox", { name: /Luis/ }))
    expect(onChange).toHaveBeenCalledWith(["u1", "u2"])
  })

  test("typing goes to the caller's search", () => {
    const onQueryChange = mock((_query: string) => {})
    open(
      remoteFilter({
        search: { query: "", onQueryChange, hint: "Escribe dos letras" },
      })
    )

    fireEvent.change(
      screen.getByRole("textbox", { name: "Buscar valores de Usuario" }),
      { target: { value: "an" } }
    )
    expect(onQueryChange).toHaveBeenCalledWith("an")
  })

  test("shows the caller's hint while there is nothing to list", () => {
    open(remoteFilter({ options: [], selected: [] }))

    expect(screen.getByText("Escribe dos letras")).toBeDefined()
  })
})
