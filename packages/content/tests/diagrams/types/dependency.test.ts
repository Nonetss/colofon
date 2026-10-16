import { describe, expect, test } from "bun:test"
import {
  boxOf,
  cleanDiagramOf,
  diagramOf,
  htmlOf,
  problemsOf,
  textOf,
} from "#tests/diagrams/types/helpers"

const SHARED = {
  type: "dependency",
  nodes: [
    { id: "web", name: "web" },
    { id: "worker", name: "worker" },
    { id: "db", name: "db" },
  ],
  deps: [
    { from: "web", to: "db" },
    { from: "worker", to: "db" },
  ],
}

const CYCLE = {
  type: "dependency",
  nodes: [
    { id: "api", name: "api" },
    { id: "auth", name: "auth" },
    { id: "log", name: "log" },
  ],
  deps: [
    { from: "api", to: "auth" },
    { from: "auth", to: "log" },
    { from: "log", to: "api" },
  ],
}

describe("dependency graph", () => {
  test("a shared dependency sits in a rank below both, reached by two edges, and counts them", () => {
    const diagram = cleanDiagramOf(SHARED)
    const db = boxOf(diagram, "db")
    expect(db.y).toBeGreaterThan(boxOf(diagram, "web").y)
    expect(db.y).toBeGreaterThan(boxOf(diagram, "worker").y)
    expect(diagram.edges.filter((edge) => edge.to === "db")).toHaveLength(2)
    expect(db.tag).toBe("2 dependen")
    expect(db.kind).toBe("store")
  })

  test("a cycle is drawn in the accent, its closing edge dashed, and listed in the text", () => {
    const diagram = cleanDiagramOf(CYCLE)
    expect(diagram.edges.map((edge) => edge.kind)).toEqual([
      "accent",
      "accent",
      "dash",
    ])
    expect(htmlOf(diagram)).toContain(">Cierra el ciclo</text>")
    expect(textOf(diagram)).toContain("<li>Ciclo: api → auth → log → api</li>")
  })

  test("two cycles are reported", () => {
    expect(
      problemsOf({
        type: "dependency",
        nodes: ["a", "b", "c", "d"].map((id) => ({ id, name: id })),
        deps: [
          { from: "a", to: "b" },
          { from: "b", to: "a" },
          { from: "c", to: "d" },
          { from: "d", to: "c" },
        ],
      })
    ).toEqual([
      "Un grafo de dependencias lleva como mucho 1 ciclo marcado y este tiene 2: pártelo en dos diagramas",
    ])
  })

  test("more than nine nodes or four ranks are reported and still drawn", () => {
    const ids = Array.from({ length: 10 }, (_, index) => `n${index}`)
    const spec = {
      type: "dependency",
      nodes: ids.map((id) => ({ id, name: id })),
      deps: ids.slice(1).map((id, index) => ({ from: ids[index], to: id })),
    }
    expect(problemsOf(spec)).toEqual([
      "Un grafo de dependencias lleva como mucho 9 nodos y este tiene 10: pártelo en dos diagramas",
      "Un grafo de dependencias lleva como mucho 4 rangos y este tiene 10: pártelo en dos diagramas",
    ])
    expect(diagramOf(spec).nodes).toHaveLength(10)
  })

  test("its text version says what each node depends on", () => {
    expect(textOf(cleanDiagramOf(SHARED))).toContain(
      "<ul><li>web depende de db</li><li>worker depende de db</li><li>db no depende de nada</li></ul>"
    )
  })
})
