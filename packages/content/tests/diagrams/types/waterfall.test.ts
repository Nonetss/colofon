import { describe, expect, test } from "bun:test"
import {
  cleanDiagramOf,
  htmlOf,
  problemsOf,
  textOf,
} from "#tests/pages/diagram-types/helpers"

const BUDGET = {
  type: "waterfall",
  unit: "€",
  start: { name: "2025", value: 1000 },
  steps: [
    { name: "Contratos", delta: 400 },
    { name: "Bajas", delta: -250 },
  ],
  end: "2026",
}

describe("waterfall", () => {
  test("bars float from the running total and the end bar shows the computed total", () => {
    const diagram = cleanDiagramOf(BUDGET)
    const bars = diagram.over.filter((graphic) => graphic.datum !== null)
    expect(bars.map((bar) => bar.datum?.value)).toEqual([
      "1.000 €",
      "+400 €",
      "−250 €",
      "1.150 €",
    ])
    const [start, rise, fall, end] = bars
    if (
      start?.kind !== "rect" ||
      rise?.kind !== "rect" ||
      fall?.kind !== "rect" ||
      end?.kind !== "rect"
    )
      throw new Error("bars are rects")
    // The rise starts where the start total ends, the fall where the rise does.
    expect(rise.y + rise.h).toBeCloseTo(start.y)
    expect(fall.y).toBeCloseTo(rise.y)
  })

  test("rises and falls are told apart", () => {
    const diagram = cleanDiagramOf(BUDGET)
    const hues = diagram.over
      .filter((graphic) => graphic.datum !== null)
      .map((bar) => bar.hue)
    expect(hues).toEqual([null, "green", "rose", null])
    const html = htmlOf(diagram)
    for (const name of ["Total", "Sube", "Baja"])
      expect(html).toContain(`>${name}</text>`)
  })

  test("the end is called Total by default", () => {
    const { end: _, ...rest } = BUDGET
    expect(textOf(cleanDiagramOf(rest))).toContain(
      "<tr><td>Total</td><td></td><td>1.150 €</td></tr>"
    )
  })

  test("its text version tables each change with the running total", () => {
    expect(textOf(cleanDiagramOf(BUDGET))).toContain(
      "<tr><td>Contratos</td><td>+400 €</td><td>1.400 €</td></tr>"
    )
  })

  test("a missing start is reported and nothing drawn; more than ten steps is over budget", () => {
    const { start: _, ...rest } = BUDGET
    expect(problemsOf(rest)).toEqual(["start: Falta: es obligatorio"])
    expect(
      problemsOf({
        ...BUDGET,
        steps: Array.from({ length: 11 }, (_, index) => ({
          name: `P${index}`,
          delta: 1,
        })),
      })
    ).toEqual([
      "Un gráfico en cascada lleva como mucho 10 pasos y este tiene 11: pártelo en dos diagramas",
    ])
  })
})
