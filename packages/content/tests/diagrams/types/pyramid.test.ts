import { describe, expect, test } from "bun:test"
import type { Graphic } from "#diagrams/model"
import {
  cleanDiagramOf,
  htmlOf,
  problemsOf,
  textOf,
} from "#tests/diagrams/types/helpers"

const FUNNEL = {
  type: "pyramid",
  variant: "funnel",
  levels: [
    { name: "Visitas", value: 1000 },
    { name: "Registros", value: 400 },
    { name: "Activos", value: 100 },
  ],
}

function topWidths(graphics: readonly Graphic[]): number[] {
  const widths: number[] = []
  for (const graphic of graphics) {
    if (graphic.kind !== "polygon") continue
    const [a, b] = graphic.points
    if (a !== undefined && b !== undefined) widths.push(b[0] - a[0])
  }
  return widths
}

describe("pyramid", () => {
  test("a pyramid narrows upwards and a funnel downwards", () => {
    const levels = [{ name: "A" }, { name: "B" }, { name: "C" }]
    const up = topWidths(cleanDiagramOf({ type: "pyramid", levels }).under)
    const down = topWidths(
      cleanDiagramOf({ type: "pyramid", variant: "funnel", levels }).under
    )
    expect(up[0]).toBeLessThan(up[2] ?? 0)
    expect(down[0]).toBeGreaterThan(down[2] ?? 0)
  })

  test("a funnel with values is as wide as its values and prints each drop-off", () => {
    const diagram = cleanDiagramOf(FUNNEL)
    const [visitas, registros] = topWidths(diagram.under)
    expect((registros ?? 0) / (visitas ?? 1)).toBeCloseTo(0.4)
    const html = htmlOf(diagram)
    expect(html).toContain(">−60 %</text>")
    expect(html).toContain(">−75 %</text>")
  })

  test("a funnel where only some levels have a value is reported and drawn without them", () => {
    expect(
      problemsOf({
        ...FUNNEL,
        levels: [{ name: "Visitas", value: 1000 }, { name: "Registros" }],
      })
    ).toEqual([
      "levels: Un embudo con valores los lleva en todos sus niveles: así su ancho dice algo",
    ])
  })

  test("more than six levels are reported", () => {
    const levels = Array.from({ length: 7 }, (_, index) => ({
      name: `N${index}`,
    }))
    expect(problemsOf({ type: "pyramid", levels })).toEqual([
      "Una pirámide lleva como mucho 6 niveles y este tiene 7: pártelo en dos diagramas",
    ])
  })

  test("its text version lists the levels with their values and drop-offs", () => {
    expect(textOf(cleanDiagramOf({ ...FUNNEL, unit: "personas" }))).toContain(
      "<ol><li>Visitas: 1.000 personas</li><li>Registros: 400 personas (−60 %)</li><li>Activos: 100 personas (−75 %)</li></ol>"
    )
  })
})
