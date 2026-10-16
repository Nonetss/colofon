import { describe, expect, test } from "bun:test"
import type { Graphic } from "#pages/diagram-types/scene"
import {
  cleanDiagramOf,
  htmlOf,
  problemsOf,
  textOf,
} from "#tests/pages/diagram-types/helpers"

const IKIGAI = {
  type: "venn",
  sets: [
    { id: "deseable", name: "Deseable" },
    { id: "viable", name: "Viable" },
    { id: "factible", name: "Factible" },
  ],
  regions: [
    { sets: ["deseable", "viable", "factible"], label: "Ikigai", focal: true },
    { sets: ["deseable", "viable"], label: "Negocio" },
  ],
}

function circles(graphics: readonly Graphic[]) {
  const found: { cx: number; cy: number; r: number }[] = []
  for (const graphic of graphics)
    if (graphic.kind === "circle" && graphic.datum !== null) found.push(graphic)
  return found
}

function labelAt(graphics: readonly Graphic[], text: string) {
  for (const graphic of graphics)
    if (graphic.kind === "text" && graphic.text === text) return graphic
  throw new Error(`no label ${text}`)
}

describe("venn", () => {
  test("a region of all three sets is labelled inside the area the three circles share", () => {
    const diagram = cleanDiagramOf(IKIGAI)
    const sets = circles(diagram.over)
    expect(sets).toHaveLength(3)
    const label = labelAt(diagram.over, "Ikigai")
    for (const circle of sets)
      expect(Math.hypot(label.x - circle.cx, label.y - circle.cy)).toBeLessThan(
        circle.r
      )
    expect(label.classes).toContain("text-accent")
  })

  test("a two-set region is labelled inside both circles and outside the third", () => {
    const diagram = cleanDiagramOf(IKIGAI)
    const [deseable, viable, factible] = circles(diagram.over)
    const label = labelAt(diagram.over, "Negocio")
    const distance = (circle: { cx: number; cy: number }) =>
      Math.hypot(label.x - circle.cx, label.y - circle.cy)
    if (!deseable || !viable || !factible) throw new Error("three circles")
    expect(distance(deseable)).toBeLessThan(deseable.r)
    expect(distance(viable)).toBeLessThan(viable.r)
    expect(distance(factible)).toBeGreaterThan(factible.r)
  })

  test("a region naming a set that does not exist is reported and left out", () => {
    expect(
      problemsOf({
        ...IKIGAI,
        regions: [{ sets: ["deseable", "rentable"], label: "Nada" }],
      })
    ).toEqual(["regions.0.sets: `rentable` no es ninguno de los conjuntos"])
  })

  test("more than three sets are reported", () => {
    expect(
      problemsOf({
        ...IKIGAI,
        sets: [...IKIGAI.sets, { id: "cuarto", name: "Cuarto" }],
        regions: [],
      })
    ).toEqual([
      "Un Venn lleva como mucho 3 conjuntos y este tiene 4: pártelo en dos diagramas",
    ])
  })

  test("its text version lists the sets, then each region", () => {
    const diagram = cleanDiagramOf(IKIGAI)
    expect(textOf(diagram)).toContain(
      "<li>Deseable ∩ Viable ∩ Factible: Ikigai</li><li>Deseable ∩ Viable: Negocio</li>"
    )
    expect(htmlOf(diagram)).toContain(">Deseable</text>")
  })
})
