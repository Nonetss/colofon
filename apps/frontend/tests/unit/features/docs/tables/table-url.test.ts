import { describe, expect, test } from "bun:test"
import {
  type DocTableState,
  initialState,
} from "@/features/docs/tables/model/doc-table"
import {
  stateFromSearch,
  tableId,
  viewHref,
} from "@/features/docs/tables/model/table-url"
import { tableModel } from "@/features/docs/tables/model/table-view"

const model = tableModel(
  ["Name", "Kind", "IP", "Notes"],
  Array.from({ length: 120 }, (_, n) => [`m${n}`, "vm", `10.0.0.${n}`, ""])
)
const base = initialState(model)
const page = "https://docs.example.org/casa/catalogo/machines?x=1"

describe("tableId", () => {
  test("the heading's id and the table's place under it", () => {
    expect(tableId("stacks", 1)).toBe("stacks-1")
    expect(tableId(null, 2)).toBe("tabla-2")
  })
})

describe("viewHref and stateFromSearch", () => {
  const state: DocTableState = {
    ...base,
    sorting: [
      { id: "ip", desc: true },
      { id: "name", desc: false },
    ],
    columnFilters: [{ id: "kind", value: ["vm", "physical"] }],
    globalFilter: "web ",
    columnVisibility: { notes: false },
    pagination: { pageIndex: 1, pageSize: 50 },
  }

  test("writes the state with the earlier site's keys, keeping other parameters", () => {
    const url = new URL(viewHref(page, "machines-1", model, state, 25))
    expect(url.searchParams.get("x")).toBe("1")
    expect(url.searchParams.get("tabla")).toBe("machines-1")
    expect(url.searchParams.get("orden")).toBe("ip.desc,name")
    expect(url.searchParams.get("f.kind")).toBe("vm|physical")
    expect(url.searchParams.get("q")).toBe("web")
    expect(url.searchParams.get("ocultas")).toBe("notes")
    expect(url.searchParams.get("pagina")).toBe("2")
    expect(url.searchParams.get("filas")).toBe("50")
    expect(url.hash).toBe("#machines-1")
  })

  test("reading the link back gives the same view", () => {
    const url = new URL(viewHref(page, "machines-1", model, state, 25))
    expect(stateFromSearch(url.search, "machines-1", model, base)).toEqual({
      ...state,
      globalFilter: "web",
    })
  })

  test("a link to another table, or none, gives nothing", () => {
    expect(
      stateFromSearch("?tabla=otra-1", "machines-1", model, base)
    ).toBeNull()
    expect(stateFromSearch("", "machines-1", model, base)).toBeNull()
  })

  test("what no longer fits is skipped: unknown columns, the first column hidden, odd page sizes", () => {
    const read = stateFromSearch(
      "?tabla=t-1&orden=gone,ip&f.gone=x&ocultas=name,notes&filas=7",
      "t-1",
      model,
      base
    )
    expect(read?.sorting).toEqual([{ id: "ip", desc: false }])
    expect(read?.columnFilters).toEqual([])
    expect(read?.columnVisibility).toEqual({ notes: false })
    expect(read?.pagination.pageSize).toBe(25)
  })

  test("a filter on a column of long text is left out of the link and the view", () => {
    const prose = tableModel(
      ["Clave", "Qué es"],
      [
        ["titulo", "x".repeat(41)],
        ["icono", "y".repeat(41)],
      ]
    )
    const state: DocTableState = {
      ...initialState(prose),
      columnFilters: [
        { id: "clave", value: ["titulo"] },
        { id: "que-es", value: ["algo"] },
      ],
    }
    const url = new URL(viewHref(page, "t-1", prose, state, 25))
    expect(url.searchParams.get("f.clave")).toBe("titulo")
    expect(url.searchParams.get("f.que-es")).toBeNull()
    const read = stateFromSearch(
      "?tabla=t-1&f.clave=titulo&f.que-es=algo",
      "t-1",
      prose,
      initialState(prose)
    )
    expect(read?.columnFilters).toEqual([{ id: "clave", value: ["titulo"] }])
  })
})
