import { describe, expect, test } from "bun:test"
import { readDiagram } from "#pages/diagrams"
import { diagramOf, problemsOf } from "#tests/pages/diagram-types/helpers"

function steps(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `s${index}`,
    name: `Paso ${index}`,
  }))
}

describe("complexity budgets", () => {
  test("a diagram over its type's budget is reported once per limit and still drawn whole", () => {
    const spec = { type: "flowchart", steps: steps(13) }
    expect(problemsOf(spec)).toEqual([
      "Un diagrama de flujo lleva como mucho 12 pasos y este tiene 13: pártelo en dos diagramas",
    ])
    expect(diagramOf(spec).nodes).toHaveLength(13)
  })

  test("a typed diagram with three accents is reported and still drawn", () => {
    const spec = {
      type: "flowchart",
      steps: [
        { id: "a", name: "A", focal: true },
        { id: "b", name: "B", focal: true },
      ],
      links: [{ from: "a", to: "b", kind: "accent" }],
    }
    expect(problemsOf(spec)).toEqual([
      "Como mucho 2 elementos van en el color de acento y este diagrama tiene 3: deja solo lo que el lector debe ver primero",
    ])
    expect(diagramOf(spec).nodes).toHaveLength(2)
  })

  test("a drawn diagram with three accents is reported too", () => {
    const box = (id: string, x: number) => ({
      id,
      name: id,
      kind: "focal",
      x,
      y: 0,
      w: 100,
      h: 40,
    })
    const read = readDiagram(
      "red",
      "diagramas/red.json",
      JSON.stringify({
        title: "Red",
        desc: "La red",
        width: 400,
        height: 100,
        nodes: [box("a", 0), box("b", 150), box("c", 300)],
      }),
      { catalog: new Map(), pages: new Set() }
    )
    expect(read.problems.map((problem) => problem.message)).toEqual([
      "Como mucho 2 elementos van en el color de acento y este diagrama tiene 3: deja solo lo que el lector debe ver primero",
    ])
  })

  test("a main path of accent arrows joined end to end counts as one accent", () => {
    const step = (id: string) => ({ id, name: id.toUpperCase() })
    expect(
      problemsOf({
        type: "flowchart",
        steps: ["a", "b", "c", "d"].map(step),
        links: [
          { from: "a", to: "b", kind: "accent" },
          { from: "b", to: "c", kind: "accent" },
          { from: "c", to: "d", kind: "accent" },
        ],
      })
    ).toEqual([])
  })

  test("a state machine's main path of joined accent transitions counts once too", () => {
    const state = (id: string) => ({ id, name: id.toUpperCase() })
    expect(
      problemsOf({
        type: "state",
        states: [
          { ...state("a"), initial: true },
          state("b"),
          state("c"),
          state("d"),
        ],
        transitions: [
          { from: "a", to: "b", kind: "accent" },
          { from: "b", to: "c", kind: "accent" },
          { from: "c", to: "d", kind: "accent" },
        ],
      })
    ).toEqual([])
  })
})
