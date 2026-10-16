import { describe, expect, test } from "bun:test"
import {
  cleanDiagramOf,
  htmlOf,
  problemsOf,
  textOf,
} from "#tests/pages/diagram-types/helpers"

const OUTAGE = {
  type: "fishbone",
  effect: { name: "Caída de la API" },
  categories: [
    { name: "Configuración", root: true, causes: ["TTL a 0"] },
    { name: "Código", causes: ["Fuga de memoria", "Sin timeout"] },
  ],
}

describe("fishbone", () => {
  test("the root-cause bone and its label are in the accent", () => {
    const diagram = cleanDiagramOf(OUTAGE)
    const accented = diagram.under.filter(
      (graphic) =>
        graphic.classes.includes("line-accent") ||
        graphic.classes.includes("text-accent")
    )
    expect(accented.map((graphic) => graphic.kind).sort()).toEqual([
      "line",
      "rect",
      "text",
    ])
    expect(htmlOf(diagram)).toContain(">Causa raíz</text>")
  })

  test("bones alternate above and below the spine", () => {
    const diagram = cleanDiagramOf(OUTAGE)
    const [first, second] = diagram.under
      .filter(
        (graphic) =>
          graphic.kind === "line" && !graphic.classes.includes("line-soft")
      )
      .slice(1)
    if (first?.kind !== "line" || second?.kind !== "line")
      throw new Error("bones")
    expect(first.y2).toBeLessThan(first.y1)
    expect(second.y2).toBeGreaterThan(second.y1)
  })

  test("more than three causes on one bone are reported", () => {
    expect(
      problemsOf({
        ...OUTAGE,
        categories: [{ name: "Código", causes: ["a", "b", "c", "d"] }],
      })
    ).toEqual([
      "Un diagrama de espina lleva como mucho 3 causas en una categoría y este tiene 4: pártelo en dos diagramas",
    ])
  })

  test("its text version gives the effect, then each category with its causes", () => {
    expect(textOf(cleanDiagramOf(OUTAGE))).toContain(
      "<ul><li>Efecto: Caída de la API</li></ul><ul><li>Configuración (causa raíz)<ul><li>TTL a 0</li></ul></li><li>Código<ul><li>Fuga de memoria</li><li>Sin timeout</li></ul></li></ul>"
    )
  })
})
