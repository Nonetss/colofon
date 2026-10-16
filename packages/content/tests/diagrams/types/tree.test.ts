import { describe, expect, test } from "bun:test"
import {
  boxOf,
  cleanDiagramOf,
  htmlOf,
  problemsOf,
  readTyped,
  textOf,
} from "#tests/diagrams/types/helpers"

const TREE = {
  type: "tree",
  nodes: [
    { id: "raiz", name: "Raíz" },
    { id: "a", name: "A", parent: "raiz" },
    { id: "b", name: "B", parent: "raiz" },
    { id: "a1", name: "A1", parent: "a" },
  ],
}

const centre = (box: { x: number; w: number }) => box.x + box.w / 2

describe("tree", () => {
  test("two roots are reported naming both, and no tree is drawn", () => {
    const read = readTyped({
      type: "tree",
      nodes: [
        { id: "a", name: "A" },
        { id: "b", name: "B" },
      ],
    })
    expect(read.diagram).toBeNull()
    expect(read.problems.map((problem) => problem.message)).toEqual([
      "nodes: Un árbol tiene una sola raíz y aquí hay 2: a, b",
    ])
  })

  test("no root, and parents that form a cycle, are reported and nothing drawn", () => {
    const cycle = readTyped({
      type: "tree",
      nodes: [
        { id: "raiz", name: "Raíz" },
        { id: "a", name: "A", parent: "b" },
        { id: "b", name: "B", parent: "a" },
      ],
    })
    expect(cycle.diagram).toBeNull()
    expect(cycle.problems.map((problem) => problem.message)).toEqual([
      "nodes: Los padres de a, b forman un ciclo: no cuelgan de la raíz",
    ])
    expect(
      readTyped({
        type: "tree",
        nodes: [
          { id: "a", name: "A", parent: "b" },
          { id: "b", name: "B", parent: "a" },
        ],
      }).diagram
    ).toBeNull()
  })

  test("a parent is centred over its children, joined by elbow connectors without heads", () => {
    const diagram = cleanDiagramOf(TREE)
    const raiz = boxOf(diagram, "raiz")
    const a = boxOf(diagram, "a")
    const b = boxOf(diagram, "b")
    expect(centre(raiz)).toBe((centre(a) + centre(b)) / 2)
    expect(a.y).toBe(b.y)
    expect(boxOf(diagram, "a1").y).toBeGreaterThan(a.y)
    const edge = diagram.edges.find((line) => line.to === "a")
    expect(edge?.noHead).toBe(true)
    expect(edge?.points).toEqual([
      [centre(raiz), raiz.y + raiz.h],
      [centre(raiz), raiz.y + raiz.h + 24],
      [centre(a), raiz.y + raiz.h + 24],
      [centre(a), a.y],
    ])
  })

  test("going right, the root is at the left and its children to its right", () => {
    const diagram = cleanDiagramOf({ ...TREE, direction: "right" })
    expect(boxOf(diagram, "a").x).toBeGreaterThan(boxOf(diagram, "raiz").x)
    expect(boxOf(diagram, "a").x).toBe(boxOf(diagram, "b").x)
  })

  test("more than four levels, or more than six children under one node, are reported", () => {
    const deep = ["a", "b", "c", "d"].map((id, index) => ({
      id,
      name: id,
      parent: ["raiz", "a", "b", "c"][index],
    }))
    expect(
      problemsOf({ type: "tree", nodes: [{ id: "raiz", name: "R" }, ...deep] })
    ).toEqual([
      "Un árbol lleva como mucho 4 niveles y este tiene 5: pártelo en dos diagramas",
    ])
    const wide = Array.from({ length: 7 }, (_, index) => ({
      id: `h${index}`,
      name: `H${index}`,
      parent: "raiz",
    }))
    expect(
      problemsOf({ type: "tree", nodes: [{ id: "raiz", name: "R" }, ...wide] })
    ).toEqual([
      "Un árbol lleva como mucho 6 hijos bajo un mismo nodo y este tiene 7: pártelo en dos diagramas",
    ])
  })

  test("a role belongs to an org chart, not to a tree", () => {
    expect(
      problemsOf({
        ...TREE,
        nodes: [{ id: "raiz", name: "Raíz", role: "CTO" }],
      })
    ).toEqual([
      "nodes.0.role: `role` es de un organigrama (type: org-chart), no de un árbol",
    ])
  })

  test("its text version is the nested list of its nodes", () => {
    expect(textOf(cleanDiagramOf(TREE))).toContain(
      "<ul><li>Raíz<ul><li>A<ul><li>A1</li></ul></li><li>B</li></ul></li></ul>"
    )
  })
})

const ORG = {
  type: "org-chart",
  nodes: [
    { id: "cto", name: "Ana", role: "CTO" },
    { id: "plat", name: "Plataforma", parent: "cto" },
    { id: "prod", name: "Producto", parent: "cto" },
    { id: "dba", name: "Marta", role: "DBA", parent: "plat", dotted: ["prod"] },
  ],
}

describe("org chart", () => {
  test("a role is the node's tag and a dotted line is a dashed curve to the other boss", () => {
    const diagram = cleanDiagramOf(ORG)
    expect(boxOf(diagram, "cto").tag).toBe("CTO")
    const dotted = diagram.edges.find((edge) => edge.kind === "dash")
    expect(dotted).toMatchObject({ from: "dba", to: "prod", route: "curve" })
    expect(htmlOf(diagram)).toContain(">También reporta a</text>")
  })

  test("a dotted line to a node that does not exist is reported", () => {
    expect(
      problemsOf({
        ...ORG,
        nodes: [...ORG.nodes.slice(0, 3), { ...ORG.nodes[3], dotted: ["cfo"] }],
      })
    ).toEqual(["nodes.3.dotted.0: `cfo` no es ninguno de los nodos"])
  })

  test("its text version gives roles and dotted lines", () => {
    expect(textOf(cleanDiagramOf(ORG))).toContain(
      "<li>Marta (DBA) · también reporta a Producto</li>"
    )
  })
})
