import { describe, expect, test } from "bun:test"
import {
  nextSort,
  rowsLabel,
  visibleRows,
} from "@/features/docs/page/model/table-view"

const rows = [
  { cells: ["web-10", "Málaga", "8080"] },
  { cells: ["web-2", "Sevilla", ""] },
  { cells: ["db-1", "Málaga", "5432"] },
]

function names(shown: { cells: string[] }[]): (string | undefined)[] {
  return shown.map((row) => row.cells[0])
}

describe("nextSort", () => {
  test("a new column sorts ascending, then descending, then not at all", () => {
    const ascending = nextSort(null, 1)
    expect(ascending).toEqual({ column: 1, desc: false })
    const descending = nextSort(ascending, 1)
    expect(descending).toEqual({ column: 1, desc: true })
    expect(nextSort(descending, 1)).toBe(null)
  })

  test("another column starts ascending again", () => {
    expect(nextSort({ column: 0, desc: true }, 2)).toEqual({
      column: 2,
      desc: false,
    })
  })
})

describe("visibleRows", () => {
  test("without search or order the rows keep their written order", () => {
    expect(names(visibleRows(rows, "", null))).toEqual([
      "web-10",
      "web-2",
      "db-1",
    ])
  })

  test("the search keeps rows holding every word, accents and case aside", () => {
    expect(names(visibleRows(rows, "MALAGA web", null))).toEqual(["web-10"])
  })

  test("sorts numbers inside text in natural order", () => {
    expect(names(visibleRows(rows, "", { column: 0, desc: false }))).toEqual([
      "db-1",
      "web-2",
      "web-10",
    ])
  })

  test("empty cells go last in both directions", () => {
    for (const desc of [false, true]) {
      const shown = visibleRows(rows, "", { column: 2, desc })
      expect(shown.at(-1)?.cells[0]).toBe("web-2")
    }
  })
})

describe("rowsLabel", () => {
  test("counts every row, or the shown ones while searching", () => {
    expect(rowsLabel(12, 12)).toBe("12 filas")
    expect(rowsLabel(3, 12)).toBe("3 de 12 filas")
    expect(rowsLabel(1, 1)).toBe("1 fila")
  })
})
