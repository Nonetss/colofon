import { describe, expect, test } from "bun:test"
import type { Graphic } from "#diagrams/model"
import {
  cleanDiagramOf,
  diagramOf,
  htmlOf,
  problemsOf,
  textOf,
} from "#tests/diagrams/types/helpers"

/** The texts among `graphics`, in order. */
function textsOf(graphics: readonly Graphic[]): string[] {
  const texts: string[] = []
  for (const graphic of graphics)
    if (graphic.kind === "text") texts.push(graphic.text)
  return texts
}

const TREND = {
  type: "line",
  x: ["2026-01", "2026-02", "2026-03"],
  series: [
    { name: "Web", values: [3, 5, 4] },
    { name: "API", values: [2, 3, 6], focal: true },
  ],
}

function circles(spec: Record<string, unknown>) {
  return diagramOf(spec).over.filter((graphic) => graphic.kind === "circle")
}

describe("line", () => {
  test("each series is a line with a mark per point, named at its last point", () => {
    const diagram = cleanDiagramOf(TREND)
    expect(circles(TREND)).toHaveLength(6)
    const names = diagram.over.filter(
      (graphic) => graphic.kind === "text" && graphic.text === "API"
    )
    expect(names).toHaveLength(1)
    expect(htmlOf(diagram)).toContain(
      'data-label="mar 2026" data-value="6" data-series="API"'
    )
  })

  test("dates on x are shown with Spanish short months", () => {
    expect(htmlOf(cleanDiagramOf(TREND))).toContain(">feb 2026</text>")
  })

  test("a slope chart with three points is reported and drawn as plain lines", () => {
    const spec = { ...TREND, variant: "slope" }
    expect(problemsOf(spec)).toEqual([
      "x: Un gráfico de pendiente compara exactamente dos puntos: se dibuja como líneas",
    ])
    expect(circles(spec)).toHaveLength(6)
  })

  test("a slope chart draws each series between two columns with both values", () => {
    const diagram = cleanDiagramOf({
      type: "line",
      variant: "slope",
      x: ["2025", "2026"],
      series: [{ name: "Web", values: [34, 71] }],
    })
    const texts = textsOf(diagram.over)
    expect(texts).toEqual(["34", "Web", "71", "Web"])
  })

  test("ridgeline, stream and bump draw their own shapes", () => {
    expect(circles({ ...TREND, variant: "ridgeline" })).toHaveLength(6)
    const stream = cleanDiagramOf({ ...TREND, variant: "stream" })
    expect(
      stream.over.filter((graphic) => graphic.datum !== null)
    ).toHaveLength(2)
    const bump = cleanDiagramOf({
      type: "line",
      variant: "bump",
      x: ["T1", "T2"],
      series: [
        { name: "Web", values: [1, 2] },
        { name: "API", values: [2, 1] },
      ],
    })
    const top = bump.over.find((graphic) => graphic.datum?.value === "1º")
    const bottom = bump.over.find((graphic) => graphic.datum?.value === "2º")
    if (top?.kind !== "circle" || bottom?.kind !== "circle")
      throw new Error("ranks are circles")
    expect(top.cy).toBeLessThan(bottom.cy)
  })

  test("a rank that is not a whole number from 1 is reported", () => {
    expect(
      problemsOf({
        type: "line",
        variant: "bump",
        x: ["T1"],
        series: [{ name: "Web", values: [1.5] }],
      })
    ).toEqual([
      "series.0.values.0: Un rango es un número entero desde 1: se dibuja como líneas",
    ])
  })

  test("a series with the wrong count is reported, and more than four series is over budget", () => {
    expect(
      problemsOf({ ...TREND, series: [{ name: "Web", values: [1] }] })
    ).toEqual([
      "series.0.values: Lleva 3 valores, uno por punto de x, y tiene 1",
    ])
    const series = Array.from({ length: 5 }, (_, index) => ({
      name: `S${index}`,
      values: [1, 2, 3],
    }))
    expect(problemsOf({ ...TREND, series })).toEqual([
      "Un gráfico de líneas lleva como mucho 4 series y este tiene 5: pártelo en dos diagramas",
    ])
    expect(problemsOf({ ...TREND, variant: "bump", series })).toEqual([])
  })

  test("its text version has a column per series", () => {
    expect(textOf(cleanDiagramOf(TREND))).toContain(
      "<tr><th></th><th>Web</th><th>API</th></tr>"
    )
  })

  test("a slope chart spreads the labels of equal values so both read, and keeps the dots on their values", () => {
    const diagram = cleanDiagramOf({
      type: "line",
      variant: "slope",
      x: ["Antes", "Ahora"],
      series: [
        { name: "Web", values: [2, 4] },
        { name: "API", values: [2, 5] },
      ],
    })
    const names = diagram.over.filter(
      (graphic) => graphic.kind === "text" && graphic.text === "API"
    )
    const webs = diagram.over.filter(
      (graphic) => graphic.kind === "text" && graphic.text === "Web"
    )
    const [api] = names
    const [web] = webs
    if (api?.kind !== "text" || web?.kind !== "text") throw new Error("labels")
    expect(Math.abs(api.y - web.y)).toBeGreaterThanOrEqual(12)
    const dots = diagram.over.filter((graphic) => graphic.kind === "circle")
    const [first, , second] = dots
    if (first?.kind !== "circle" || second?.kind !== "circle")
      throw new Error("dots")
    expect(first.cy).toBe(second.cy)
  })
})
