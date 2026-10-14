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

function listFilter(overrides: Partial<DataTableFilter> = {}): DataTableFilter {
  return {
    options: [
      { value: "GET", label: "GET" },
      { value: "POST", label: "POST" },
      { value: "PUT", label: "PUT" },
    ],
    selected: [],
    onChange: () => {},
    ...overrides,
  }
}

function checkedOf(name: string | RegExp): string | null {
  return screen.getByRole("checkbox", { name }).getAttribute("aria-checked")
}

describe("DataTableColumnFilter select-all", () => {
  test("clicking it while every value is kept unchecks them all, without filtering yet", () => {
    const onChange = mock((_next: string[]) => {})
    open(listFilter({ onChange }))

    fireEvent.click(screen.getByRole("checkbox", { name: "Seleccionar todo" }))

    expect(checkedOf("Seleccionar todo")).toBe("false")
    for (const value of ["GET", "POST", "PUT"]) {
      expect(checkedOf(value)).toBe("false")
    }
    expect(onChange).not.toHaveBeenCalled()
  })

  test("after unchecking them all, checking a value keeps only that one", () => {
    const onChange = mock((_next: string[]) => {})
    open(listFilter({ onChange }))

    fireEvent.click(screen.getByRole("checkbox", { name: "Seleccionar todo" }))
    fireEvent.click(screen.getByRole("checkbox", { name: "POST" }))

    expect(onChange).toHaveBeenCalledWith(["POST"])
  })

  test("clicking it again after unchecking them all checks every value", () => {
    open(listFilter())

    const selectAll = () =>
      fireEvent.click(
        screen.getByRole("checkbox", { name: "Seleccionar todo" })
      )
    selectAll()
    selectAll()

    expect(checkedOf("Seleccionar todo")).toBe("true")
    expect(checkedOf("GET")).toBe("true")
  })

  test("clicking it while some values are filtered out keeps every value", () => {
    const onChange = mock((_next: string[]) => {})
    open(listFilter({ selected: ["GET"], onChange }))

    fireEvent.click(screen.getByRole("checkbox", { name: "Seleccionar todo" }))

    expect(onChange).toHaveBeenCalledWith([])
  })
})
