import { describe, expect, test } from "bun:test"
import type { Diagram } from "#diagrams/model"
import { RAMP } from "#diagrams/types/heatmap"
import {
  cleanDiagramOf,
  diagramOf,
  htmlOf,
  problemsOf,
  textOf,
} from "#tests/diagrams/types/helpers"

const ERRORS = {
  type: "heatmap",
  rows: ["auth", "pagos"],
  columns: ["S1", "S2", "S3"],
  values: [
    [0, 10, 25],
    [30, 50, null],
  ],
  unit: "%",
}

/** The cells drawn as data marks, by their label. */
function cells(diagram: Diagram) {
  return new Map(
    diagram.over
      .filter((graphic) => graphic.datum !== null)
      .map((graphic) => [graphic.datum?.label ?? "", graphic])
  )
}

describe("heatmap", () => {
  test("cells are shaded from the palest visible shade at the smallest value to the darkest at the largest", () => {
    const drawn = cells(cleanDiagramOf(ERRORS))
    expect(drawn.get("auth · S1")?.opacity).toBe(RAMP.low)
    expect(RAMP.low).toBeGreaterThan(0)
    expect(drawn.get("pagos · S2")?.opacity).toBe(RAMP.high)
    const middle = drawn.get("auth · S3")?.opacity ?? 0
    expect(middle).toBeGreaterThan(RAMP.low)
    expect(middle).toBeLessThan(RAMP.high)
  })

  test("the focal cell is in the accent and kept out of the ramp", () => {
    const drawn = cells(cleanDiagramOf({ ...ERRORS, focal: [1, 1] }))
    expect(drawn.get("pagos · S2")?.classes).toContain("fill-accent")
    expect(drawn.get("pagos · S1")?.opacity).toBe(RAMP.high)
  })

  test("an empty cell is drawn empty and has no mark", () => {
    const diagram = cleanDiagramOf(ERRORS)
    expect(cells(diagram).has("pagos · S3")).toBe(false)
    expect(textOf(diagram)).toContain("<td>—</td>")
  })

  test("a row with another count of cells is reported", () => {
    expect(
      problemsOf({
        ...ERRORS,
        values: [
          [1, 2, 3],
          [4, 5],
        ],
      })
    ).toEqual(['values.1: La fila "pagos" tiene 2 valores y hay 3 columnas'])
  })

  test("a focal cell outside the grid is reported", () => {
    expect(problemsOf({ ...ERRORS, focal: [5, 0] })).toEqual([
      "focal: [5, 0] no es ninguna celda",
    ])
  })

  test("more than 12 rows is over budget and still drawn", () => {
    const rows = Array.from({ length: 13 }, (_, index) => `r${index}`)
    const spec = {
      type: "heatmap",
      rows,
      columns: ["a"],
      values: rows.map((_, index) => [index]),
    }
    expect(problemsOf(spec)).toEqual([
      "Un mapa de calor lleva como mucho 12 filas y este tiene 13: pártelo en dos diagramas",
    ])
    expect(cells(diagramOf(spec)).size).toBe(13)
  })

  test("its text version is a table of the values", () => {
    const text = textOf(cleanDiagramOf(ERRORS))
    expect(text).toContain("<th>S1</th><th>S2</th><th>S3</th>")
    expect(text).toContain(
      "<tr><td>auth</td><td>0 %</td><td>10 %</td><td>25 %</td></tr>"
    )
    expect(htmlOf(cleanDiagramOf(ERRORS))).toContain('data-value="50 %"')
  })
})
