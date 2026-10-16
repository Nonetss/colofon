import { afterEach, describe, expect, test } from "bun:test"
import { act, cleanup, renderHook } from "@testing-library/react"
import { useDocTable } from "@/features/docs/tables/hooks/use-doc-table"
import {
  type DocTableState,
  facetOptions,
  initialState,
  isFiltered,
  keptValues,
  tableChips,
  withoutFilters,
} from "@/features/docs/tables/model/doc-table"
import {
  type TableModel,
  tableModel,
} from "@/features/docs/tables/model/table-view"

afterEach(() => {
  cleanup()
})

const machines = tableModel(
  ["Name", "Kind", "IP", "Notes"],
  [
    ["web-10", "vm", "192.168.1.10", ""],
    ["web-2", "vm", "192.168.1.9", "Málaga"],
    ["nas", "physical", "192.168.1.30", ""],
    ["pve-01", "physical", "192.168.1.2", "host"],
    ["vps", "vps", "203.0.113.4", ""],
    ["db", "vm", "192.168.1.40", ""],
    ["router", "physical", "192.168.1.1", ""],
    ["printer", "", "192.168.1.50", ""],
  ]
)

function render(model: TableModel, change: Partial<DocTableState> = {}) {
  return renderHook(() =>
    useDocTable(model, { ...initialState(model), ...change })
  )
}

function names(result: ReturnType<typeof render>["result"]) {
  return result.current.table
    .getRowModel()
    .rows.map((row) => row.original.text[0])
}

describe("sorting", () => {
  test("IPs by each number, through TanStack's sort", () => {
    const { result } = render(machines)
    act(() => result.current.table.getColumn("ip")?.toggleSorting(false))
    expect(names(result)).toEqual([
      "router",
      "pve-01",
      "web-2",
      "web-10",
      "nas",
      "db",
      "printer",
      "vps",
    ])
  })

  test("a second column with Shift, and empty cells always last", () => {
    const { result } = render(machines)
    act(() => result.current.table.getColumn("kind")?.toggleSorting(true))
    act(() =>
      result.current.table.getColumn("name")?.toggleSorting(false, true)
    )
    expect(result.current.state.sorting).toEqual([
      { id: "kind", desc: true },
      { id: "name", desc: false },
    ])
    expect(names(result)).toEqual([
      "vps",
      "db",
      "web-2",
      "web-10",
      "nas",
      "pve-01",
      "router",
      "printer",
    ])
  })

  test("a header pressed cycles ascending, descending and the written order", () => {
    const { result } = render(machines)
    const press = () => result.current.table.getColumn("name")?.toggleSorting()
    act(press)
    expect(result.current.state.sorting).toEqual([{ id: "name", desc: false }])
    act(press)
    expect(result.current.state.sorting).toEqual([{ id: "name", desc: true }])
    act(press)
    expect(result.current.state.sorting).toEqual([])
  })
})

describe("filtering", () => {
  test("the box takes column:value and folds accents", () => {
    const { result } = render(machines)
    act(() => result.current.table.setGlobalFilter("kind:vm"))
    expect(names(result)).toEqual(["web-10", "web-2", "db"])
    act(() => result.current.table.setGlobalFilter("malaga"))
    expect(names(result)).toEqual(["web-2"])
  })

  test("a free word only looks in the columns shown", () => {
    const { result } = render(machines, {
      columnVisibility: { notes: false },
    })
    act(() => result.current.table.setGlobalFilter("malaga"))
    expect(names(result)).toEqual([])
  })

  test("kept values filter a column, the empty value included", () => {
    const { result } = render(machines)
    act(() =>
      result.current.table.getColumn("kind")?.setFilterValue(["physical", ""])
    )
    expect(names(result)).toEqual(["nas", "pve-01", "router", "printer"])
  })

  test("a column's options count rows under the box and the other filters", () => {
    const { result } = render(machines, {
      globalFilter: "192.168",
      columnFilters: [
        { id: "kind", value: ["vps"] },
        { id: "notes", value: [""] },
      ],
    })
    const kind = result.current.table.getColumn("kind")
    if (kind === undefined) throw new Error("No kind column")
    expect(
      facetOptions(machines, 1, kind.getFacetedUniqueValues(), ["vps"])
    ).toEqual([
      { value: "physical", label: "physical", count: 2 },
      { value: "vm", label: "vm", count: 2 },
      { value: "", label: "(vacía)", count: 1 },
      { value: "vps", label: "vps", count: 0 },
    ])
  })
})

describe("pages", () => {
  const long = tableModel(
    ["n"],
    Array.from({ length: 120 }, (_, n) => [String(n)])
  )

  test("a long table shows 25 rows of 5 pages", () => {
    const { result } = render(long)
    expect(result.current.table.getRowModel().rows).toHaveLength(25)
    expect(result.current.table.getPageCount()).toBe(5)
  })

  test("a change of the box goes back to the first page", () => {
    const { result } = render(long)
    act(() => result.current.table.setPageIndex(3))
    expect(result.current.state.pagination.pageIndex).toBe(3)
    act(() => result.current.table.setGlobalFilter("1"))
    expect(result.current.state.pagination.pageIndex).toBe(0)
  })
})

describe("chips and clearing", () => {
  test("a chip per filter in column order, then the box; clearing drops them", () => {
    const state: DocTableState = {
      ...initialState(machines),
      globalFilter: " web ",
      columnFilters: [{ id: "kind", value: ["vm", ""] }],
    }
    expect(tableChips(machines, state)).toEqual([
      { kind: "filter", column: "kind", label: "Kind: vm, (vacía)" },
      { kind: "query", label: "Texto: «web»" },
    ])
    expect(isFiltered(state)).toBe(true)
    expect(isFiltered(withoutFilters(state))).toBe(false)
  })

  test("only strings count as kept values", () => {
    expect(keptValues(["a", 1, "b"])).toEqual(["a", "b"])
    expect(keptValues("a")).toEqual([])
  })
})
