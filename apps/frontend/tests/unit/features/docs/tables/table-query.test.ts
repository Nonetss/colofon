import { describe, expect, test } from "bun:test"
import {
  rowMatches,
  tableTerms,
} from "@/features/docs/tables/model/table-query"

const headers = ["Nombre", "Estado", "Estación", "IP"]

describe("tableTerms", () => {
  test("free words, folded", () => {
    expect(tableTerms("Málaga  NAS", headers)).toEqual([
      { column: null, value: "malaga" },
      { column: null, value: "nas" },
    ])
  })

  test("name:value looks in the column with that header or the only one it prefixes", () => {
    expect(tableTerms("estado:hecho ip:10.0", headers)).toEqual([
      { column: 1, value: "hecho" },
      { column: 3, value: "10.0" },
    ])
    expect(tableTerms("nom:web", headers)).toEqual([
      { column: 0, value: "web" },
    ])
  })

  test("a name that fits several columns or none is searched as typed, and name: alone is dropped", () => {
    expect(tableTerms("esta:x zona:y estado:", headers)).toEqual([
      { column: null, value: "esta:x" },
      { column: null, value: "zona:y" },
    ])
  })
})

describe("rowMatches", () => {
  const cells = ["web-01", "hecho", "c11", "10.0.0.1"]

  test("every term must be found, a free one in any visible column", () => {
    expect(
      rowMatches(tableTerms("web hecho", headers), cells, [0, 1, 2, 3])
    ).toBe(true)
    expect(
      rowMatches(tableTerms("web pendiente", headers), cells, [0, 1])
    ).toBe(false)
  })

  test("a free word in a hidden column does not match; a column term still does", () => {
    expect(rowMatches(tableTerms("c11", headers), cells, [0, 1])).toBe(false)
    expect(rowMatches(tableTerms("estacion:c11", headers), cells, [0])).toBe(
      true
    )
  })
})
