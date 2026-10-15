import { describe, expect, test } from "bun:test"
import {
  facetLabel,
  pageLabel,
  rowsLabel,
  tableModel,
} from "@/features/docs/page/model/table-view"

const headers = ["Name", "Kind", "IP", "Notes"]
const cells = Array.from({ length: 8 }, (_, n) => [
  `web-${n}`,
  "vm",
  `10.0.0.${n}`,
  "",
])

describe("tableModel", () => {
  test("columns get slug ids, unique, and their kind", () => {
    const repeated = tableModel(["Estado", "Estado", ""], [["a", "b", "c"]])
    expect(repeated.columns.map((column) => column.id)).toEqual([
      "estado",
      "estado-2",
      "col3",
    ])
    expect(
      tableModel(headers, cells).columns.map((column) => column.kind)
    ).toEqual(["text", "text", "ip", "text"])
  })

  test("rows keep their texts, folded texts and sort keys", () => {
    const [row] = tableModel(["Ciudad"], [["  Málaga \n centro "]]).rows
    expect(row?.text).toEqual(["Málaga centro"])
    expect(row?.folded).toEqual(["malaga centro"])
    expect(row?.keys).toEqual(["Málaga centro"])
  })

  test("a toolbar from 2 rows, and pages above 50", () => {
    expect(tableModel(headers, cells).full).toBe(true)
    expect(tableModel(headers, cells).paged).toBe(false)
    expect(tableModel(headers, cells.slice(0, 2)).full).toBe(true)
    expect(tableModel(headers, cells.slice(0, 1)).full).toBe(false)
    const long = tableModel(
      ["n"],
      Array.from({ length: 51 }, (_, n) => [String(n)])
    )
    expect(long.paged).toBe(true)
  })
})

describe("labels", () => {
  test("the count says how many of the total while filtered", () => {
    expect(rowsLabel(8, 8, false)).toBe("8 filas")
    expect(rowsLabel(3, 12, true)).toBe("3 de 12 filas")
    expect(rowsLabel(1, 1, false)).toBe("1 fila")
  })

  test("pages and empty values", () => {
    expect(pageLabel(1, 5)).toBe("Página 2 de 5")
    expect(pageLabel(0, 0)).toBe("Página 1 de 1")
    expect(facetLabel("")).toBe("(vacía)")
  })
})
