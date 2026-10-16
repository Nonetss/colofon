import { describe, expect, test } from "bun:test"
import { ribbonPath } from "#pages/diagram-types/sankey"
import type { Diagram } from "#pages/diagrams"
import {
  cleanDiagramOf,
  diagramOf,
  problemsOf,
  textOf,
} from "#tests/pages/diagram-types/helpers"

const CI = {
  type: "sankey",
  columns: [
    [{ id: "ci", name: "CI" }],
    [
      { id: "tests", name: "Tests" },
      { id: "build", name: "Build" },
    ],
    [
      { id: "ok", name: "Pasan" },
      { id: "ko", name: "Fallan" },
    ],
  ],
  flows: [
    { from: "ci", to: "tests", value: 5200 },
    { from: "ci", to: "build", value: 2000 },
    { from: "tests", to: "ok", value: 4000, focal: true },
    { from: "tests", to: "ko", value: 1200 },
    { from: "build", to: "ok", value: 2000 },
  ],
}

/** The marks' heights or thicknesses, by label. */
function bars(diagram: Diagram): Map<string, number> {
  const found = new Map<string, number>()
  for (const graphic of diagram.over)
    if (graphic.datum !== null && graphic.kind === "rect")
      found.set(graphic.datum.label, graphic.h)
  return found
}

describe("sankey", () => {
  test("bars share one scale, so a node's height follows what passes through it", () => {
    const drawn = bars(cleanDiagramOf(CI))
    const ratio = (drawn.get("CI") ?? 0) / (drawn.get("Build") ?? 1)
    expect(ratio).toBeCloseTo(7200 / 2000, 1)
  })

  test("a middle node that receives more than it sends is reported", () => {
    expect(
      problemsOf({
        ...CI,
        flows: CI.flows.map((flow) => {
          if (flow.to === "ko") return { ...flow, value: 1000 }
          return flow
        }),
      })
    ).toEqual([
      "columns.1.0: `tests` recibe 5.200 y envía 5.000: lo que entra en un nodo del medio sale de él",
    ])
  })

  test("a flow skipping a column or going backwards is reported and left out", () => {
    const spec = {
      ...CI,
      flows: [...CI.flows, { from: "ci", to: "ok", value: 10 }],
    }
    expect(problemsOf(spec)).toContain(
      "flows.5: Un flujo va de una columna a la siguiente: `ci` está en la columna 1 y `ok` en la 3"
    )
    const ribbons = diagramOf(spec).under.filter(
      (graphic) => graphic.datum !== null
    )
    expect(ribbons).toHaveLength(5)
  })

  test("ribbons leave and reach their bars horizontally, the focal one in the accent and drawn last", () => {
    expect(ribbonPath(100, 300, 40, 80, 20)).toBe(
      "M100 40 C200 40 200 80 300 80 L300 100 C200 100 200 60 100 60 Z"
    )
    const ribbons = cleanDiagramOf(CI).under.filter(
      (graphic) => graphic.datum !== null
    )
    expect(ribbons.at(-1)?.classes).toContain("fill-accent")
    expect(ribbons.at(-1)?.datum?.label).toBe("Tests → Pasan")
  })

  test("more than 8 nodes is over budget and still drawn", () => {
    const right = Array.from({ length: 9 }, (_, index) => ({
      id: `n${index}`,
      name: `N${index}`,
    }))
    const spec = {
      type: "sankey",
      columns: [[{ id: "a", name: "A" }], right],
      flows: right.map((node) => ({ from: "a", to: node.id, value: 1 })),
    }
    expect(problemsOf(spec)).toEqual([
      "Un Sankey lleva como mucho 8 nodos y este tiene 10: pártelo en dos diagramas",
    ])
    expect(bars(diagramOf(spec)).size).toBe(10)
  })

  test("its text version lists every flow with its value", () => {
    expect(textOf(cleanDiagramOf(CI))).toContain(
      "<li>CI → Tests: 5.200</li><li>CI → Build: 2.000</li>"
    )
  })
})
