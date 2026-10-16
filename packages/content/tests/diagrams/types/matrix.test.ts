import { describe, expect, test } from "bun:test"
import {
  cleanDiagramOf,
  diagramOf,
  htmlOf,
  problemsOf,
  textOf,
} from "#tests/diagrams/types/helpers"

const ACCESS = {
  type: "matrix",
  rows: [{ name: "MinIO" }, { name: "Trino" }],
  columns: [{ name: "Admins" }, { name: "Analistas" }],
  levels: ["Lectura", "Escritura"],
  cells: [
    ["Escritura", null],
    ["Escritura", "Lectura"],
  ],
}

describe("matrix", () => {
  test("cells are shaded darker the more their level allows, and the levels are listed", () => {
    const diagram = cleanDiagramOf(ACCESS)
    const cells = diagram.over.filter(
      (graphic) => graphic.kind === "rect" && graphic.datum !== null
    )
    expect(cells.map((cell) => cell.opacity)).toEqual([0.72, null, 0.72, 0.1])
    const html = htmlOf(diagram)
    expect(html).toContain(
      '<g class="doc-diagram-legend-entry" data-series="Escritura">'
    )
    expect(html).toContain(
      'data-label="Trino · Analistas" data-value="Lectura"'
    )
  })

  test("a level that is not one of the levels is reported on its cell and drawn empty", () => {
    const spec = {
      ...ACCESS,
      cells: [
        ["Borrar", null],
        ["Escritura", "Lectura"],
      ],
    }
    expect(problemsOf(spec)).toEqual([
      "cells.0.0: `Borrar` no es ninguno de los niveles (Lectura, Escritura)",
    ])
    expect(htmlOf(diagramOf(spec))).toContain(
      'data-label="MinIO · Admins" data-value="—"'
    )
  })

  test("a row whose cell count differs from the columns is reported", () => {
    expect(
      problemsOf({ ...ACCESS, cells: [["Lectura"], ["Lectura", "Lectura"]] })
    ).toEqual(["cells.0: La fila tiene 1 celdas y hay 2 columnas"])
  })

  test("more than eight columns are reported", () => {
    const columns = Array.from({ length: 9 }, (_, index) => ({
      name: `R${index}`,
    }))
    expect(
      problemsOf({
        ...ACCESS,
        columns,
        cells: ACCESS.rows.map(() => columns.map(() => null)),
      })
    ).toEqual([
      "Una matriz lleva como mucho 8 columnas y este tiene 9: pártelo en dos diagramas",
    ])
  })

  test("its text version is a table", () => {
    expect(textOf(cleanDiagramOf(ACCESS))).toContain(
      "<table><thead><tr><th></th><th>Admins</th><th>Analistas</th></tr></thead><tbody><tr><td>MinIO</td><td>Escritura</td><td>—</td></tr><tr><td>Trino</td><td>Escritura</td><td>Lectura</td></tr></tbody></table>"
    )
  })
})
