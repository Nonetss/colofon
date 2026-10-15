import { describe, expect, test } from "bun:test"
import type { Catalog } from "#catalog"
import {
  type Box,
  createLayoutEngine,
  layoutDiagram,
  nodeSize,
  wrapText,
} from "#pages/diagram-layout"
import { type Diagram, readDiagram, readDiagrams } from "#pages/diagrams"
import { createContentDir } from "#tests/fixtures/content-dir"

const NO_CATALOG: Catalog = new Map()

function diagramOf(text: string): Diagram {
  const read = readDiagram("prueba", "diagramas/prueba.yaml", text, NO_CATALOG)
  if (read.diagram === null) throw new Error(JSON.stringify(read.problems))
  return read.diagram
}

const PIPELINE = [
  "titulo: Pipeline",
  "descripcion: De un push al sitio",
  "nodos:",
  "  writer: { nombre: Autor, tipo: entrada }",
  "  repo: { nombre: Repositorio, sub: git, tipo: almacen }",
  "  platform: Plataforma",
  "  reader: Lector",
  "conexiones:",
  "  - writer -> repo: git push",
  "  - repo -> platform: sincroniza",
  "  - platform -> reader",
  "zonas:",
  "  yours: { titulo: Tu lado, nodos: [writer, repo] }",
].join("\n")

function encloses(outer: Box, inner: Box): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  )
}

function nodeBox<T extends { id: string }>(boxes: T[], id: string): T {
  const found = boxes.find((box) => box.id === id)
  if (found === undefined) throw new Error(`No box "${id}"`)
  return found
}

describe("layoutDiagram", () => {
  test("derecha lays the flow left to right and abajo top to bottom", async () => {
    const engine = createLayoutEngine()
    const right = await layoutDiagram(diagramOf(PIPELINE), engine)
    const down = await layoutDiagram(
      diagramOf(`${PIPELINE}\ndireccion: abajo`),
      engine
    )
    const [writer, reader] = ["writer", "reader"].map((id) =>
      nodeBox(right.nodes, id)
    )
    expect(reader?.x).toBeGreaterThan(writer?.x ?? 0)
    const [top, bottom] = ["writer", "reader"].map((id) =>
      nodeBox(down.nodes, id)
    )
    expect(bottom?.y).toBeGreaterThan(top?.y ?? 0)
    expect(right.width).toBeGreaterThan(right.height)
    expect(down.height).toBeGreaterThan(down.width)
  })

  test("every node, zone and edge is placed, each zone around its nodes, inside the drawing", async () => {
    const layout = await layoutDiagram(
      diagramOf(PIPELINE),
      createLayoutEngine()
    )
    expect(layout.nodes.map((node) => node.id).sort()).toEqual([
      "platform",
      "reader",
      "repo",
      "writer",
    ])
    const yours = nodeBox(layout.zones, "yours")
    expect(encloses(yours, nodeBox(layout.nodes, "writer"))).toBe(true)
    expect(encloses(yours, nodeBox(layout.nodes, "repo"))).toBe(true)
    expect(encloses(yours, nodeBox(layout.nodes, "reader"))).toBe(false)
    const drawing = { x: 0, y: 0, width: layout.width, height: layout.height }
    for (const box of [...layout.nodes, ...layout.zones])
      expect(encloses(drawing, box)).toBe(true)
    expect(layout.edges.map((edge) => [edge.from, edge.to])).toEqual([
      ["writer", "repo"],
      ["repo", "platform"],
      ["platform", "reader"],
    ])
    for (const edge of layout.edges)
      expect(edge.points.length).toBeGreaterThanOrEqual(2)
    expect(layout.edges.map((edge) => edge.label !== null)).toEqual([
      true,
      true,
      false,
    ])
    expect(layout.edges.map((edge) => edge.lines)).toEqual([
      ["git push"],
      ["sincroniza"],
      [],
    ])
  })

  test("a loop is broken against the order written: the flow follows the declaration", async () => {
    const layout = await layoutDiagram(
      diagramOf(
        PIPELINE.replace(
          "  - platform -> reader",
          "  - platform -> reader\n  - reader -> writer: feedback"
        )
      ),
      createLayoutEngine()
    )
    const writer = nodeBox(layout.nodes, "writer")
    const reader = nodeBox(layout.nodes, "reader")
    expect(reader.x).toBeGreaterThan(writer.x)
  })

  test("an edge inside a zone ends on its nodes' borders, in the drawing's coordinates", async () => {
    const layout = await layoutDiagram(
      diagramOf(PIPELINE),
      createLayoutEngine()
    )
    const [inside] = layout.edges
    const writer = nodeBox(layout.nodes, "writer")
    const start = inside?.points[0]
    expect(start?.x).toBe(writer.x + writer.width)
    expect(start?.y).toBeGreaterThanOrEqual(writer.y)
    expect(start?.y).toBeLessThanOrEqual(writer.y + writer.height)
  })

  test("boxes share a height, and left to right each column takes its widest name's width", async () => {
    const layout = await layoutDiagram(
      diagramOf(
        PIPELINE.replace(
          "repo: { nombre: Repositorio,",
          "repo: { nombre: Repositorio de contenido de la plataforma,"
        )
      ),
      createLayoutEngine()
    )
    const writer = nodeBox(layout.nodes, "writer")
    const repo = nodeBox(layout.nodes, "repo")
    const reader = nodeBox(layout.nodes, "reader")
    expect(writer.width).toBe(176)
    expect(reader.width).toBe(176)
    expect(repo.width).toBeGreaterThan(176)
    expect(repo.width % 8).toBe(0)
    expect(new Set(layout.nodes.map((box) => box.height)).size).toBe(1)
  })

  test("the same diagram is laid out the same way every time", async () => {
    const first = await layoutDiagram(diagramOf(PIPELINE), createLayoutEngine())
    const second = await layoutDiagram(
      diagramOf(PIPELINE),
      createLayoutEngine()
    )
    expect(second).toEqual(first)
  })
})

describe("readDiagrams", () => {
  test("lays every diagram out", async () => {
    const dir = await createContentDir({ "diagramas/prueba.yaml": PIPELINE })
    try {
      const { diagrams, problems } = await readDiagrams(dir.root, NO_CATALOG)
      expect(problems).toEqual([])
      expect(diagrams.get("prueba")?.diagram?.layout?.nodes).toHaveLength(4)
    } finally {
      await dir.remove()
    }
  })

  test("a layout that fails is reported on the file and the diagram stays, without a layout", async () => {
    const dir = await createContentDir({ "diagramas/prueba.yaml": PIPELINE })
    const failing = {
      layout: () => Promise.reject(new Error("ciclo imposible")),
    }
    try {
      const { diagrams, problems } = await readDiagrams(
        dir.root,
        NO_CATALOG,
        failing
      )
      expect(problems).toEqual([
        {
          file: "diagramas/prueba.yaml",
          line: null,
          message:
            "No se pudo colocar el diagrama, se muestra como texto: ciclo imposible",
        },
      ])
      const diagram = diagrams.get("prueba")?.diagram
      expect(diagram?.title).toBe("Pipeline")
      expect(diagram?.layout).toBeNull()
    } finally {
      await dir.remove()
    }
  })
})

describe("node sizes", () => {
  test("a long name widens its box and a sub adds a line per wrap", () => {
    const short = nodeSize({
      id: "a",
      name: "NAS",
      sub: null,
      icon: null,
      kind: null,
      entity: null,
    })
    const long = nodeSize({
      id: "b",
      name: "Repositorio de contenido de la plataforma",
      sub: "una persona o un agente que escribe la documentación del sitio",
      icon: "git-branch",
      kind: null,
      entity: null,
    })
    expect(long.width).toBeGreaterThan(short.width)
    expect(long.height).toBeGreaterThan(short.height)
  })

  test("wrapText breaks at spaces within the width", () => {
    expect(wrapText("una persona o un agente", 12)).toEqual([
      "una persona",
      "o un agente",
    ])
    expect(wrapText("supercalifragilístico", 5)).toEqual([
      "supercalifragilístico",
    ])
  })
})
