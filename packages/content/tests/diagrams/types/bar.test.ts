import { describe, expect, test } from "bun:test"
import {
  cleanDiagramOf,
  diagramOf,
  htmlOf,
  problemsOf,
  textOf,
} from "#tests/pages/diagram-types/helpers"

const MONTHS = {
  type: "bar",
  unit: "usuarios",
  categories: ["Enero", "Febrero", "Marzo"],
  series: [{ name: "Altas", values: [420, 870, 1200] }],
}

describe("bar", () => {
  test("a value is labelled with Spanish separators, its decimals and unit", () => {
    const html = htmlOf(
      cleanDiagramOf({
        type: "bar",
        unit: "€",
        decimals: 1,
        categories: ["Uno"],
        series: [{ name: "Coste", values: [1234.5] }],
      })
    )
    expect(html).toContain(">1.234,5 €</text>")
  })

  test("the value axis ends on a round number: 870 ends at 1000, labelled every 200", () => {
    const html = htmlOf(
      cleanDiagramOf({
        type: "bar",
        categories: ["A", "B"],
        series: [{ name: "S", values: [500, 870] }],
      })
    )
    for (const tick of ["0", "200", "400", "600", "800", "1.000"])
      expect(html).toContain(`text-anchor="end">${tick}</text>`)
    expect(html).not.toContain(">1.200</text>")
  })

  test("each bar is a mark of its series with its formatted value", () => {
    const html = htmlOf(cleanDiagramOf(MONTHS))
    expect(html).toContain(
      'data-node="m2" data-label="Marzo" data-value="1.200 usuarios" data-series="Altas"'
    )
  })

  test("the focal category is drawn in the accent", () => {
    const diagram = cleanDiagramOf({ ...MONTHS, focal: "Marzo" })
    const focal = diagram.over.find(
      (graphic) => graphic.datum?.label === "Marzo"
    )
    expect(focal?.classes).toEqual(["fill-accent-tint", "line-accent"])
  })

  test("a focal that is no category and a series with the wrong count are reported", () => {
    expect(
      problemsOf({
        ...MONTHS,
        focal: "Junio",
        series: [
          { name: "Altas", values: [1, 2, 3] },
          { name: "Bajas", values: [1, 2] },
        ],
      })
    ).toEqual([
      "series.1.values: Lleva 3 valores, uno por categoría, y tiene 2",
      "focal: `Junio` no es ninguna de las categorías",
    ])
  })

  test("two series are told apart in a legend that lights each one", () => {
    const html = htmlOf(
      cleanDiagramOf({
        ...MONTHS,
        series: [
          { name: "2025", values: [1, 2, 3] },
          { name: "2026", values: [3, 2, 1] },
        ],
      })
    )
    expect(html).toContain(
      '<g class="doc-diagram-legend-entry" data-series="2025">'
    )
    expect(html).toContain(
      '<g class="doc-diagram-legend-entry" data-series="2026">'
    )
  })

  test("horizontal bars put the categories on the left", () => {
    const diagram = cleanDiagramOf({ ...MONTHS, orientation: "horizontal" })
    const name = diagram.over.find(
      (graphic) => graphic.kind === "text" && graphic.text === "Enero"
    )
    expect(name?.kind === "text" && name.anchor).toBe("end")
  })

  test("a dumbbell draws two dots per category joined by a line", () => {
    const diagram = cleanDiagramOf({
      ...MONTHS,
      variant: "dumbbell",
      series: [
        { name: "2025", values: [1, 2, 3] },
        { name: "2026", values: [3, 2, 1] },
      ],
    })
    const dots = diagram.over.filter((graphic) => graphic.kind === "circle")
    expect(dots).toHaveLength(6)
  })

  test("a dumbbell with one series is reported and drawn as bars", () => {
    const spec = { ...MONTHS, variant: "dumbbell" }
    expect(problemsOf(spec)).toEqual([
      "series: Un gráfico de mancuernas compara dos series: se dibuja como barras",
    ])
    expect(
      diagramOf(spec).over.filter((graphic) => graphic.kind === "rect")
    ).toHaveLength(3)
  })

  test("more than 12 categories is over budget", () => {
    const categories = Array.from({ length: 13 }, (_, index) => `C${index}`)
    expect(
      problemsOf({
        type: "bar",
        categories,
        series: [{ name: "S", values: categories.map(() => 1) }],
      })
    ).toEqual([
      "Un gráfico de barras lleva como mucho 12 categorías y este tiene 13: pártelo en dos diagramas",
    ])
  })

  test("its text version is a table of the values", () => {
    expect(textOf(cleanDiagramOf(MONTHS))).toContain(
      "<tr><td>Febrero</td><td>870 usuarios</td></tr>"
    )
  })
})
