import { describe, expect, test } from "bun:test"
import {
  cleanDiagramOf,
  htmlOf,
  problemsOf,
  textOf,
} from "#tests/diagrams/types/helpers"

const STACK = {
  type: "layers",
  layers: [
    { name: "Aplicación", sub: "Astro", items: ["frontend", "admin"] },
    { name: "API", focal: true },
    { name: "Datos", sub: "PostgreSQL" },
  ],
}

describe("layers", () => {
  test("layers are full-width bands from top to bottom, numbered, with their pieces as chips", () => {
    const diagram = cleanDiagramOf(STACK)
    const bands = diagram.under.filter((graphic) => graphic.kind === "rect")
    expect(bands).toHaveLength(3)
    const html = htmlOf(diagram)
    expect(html).toContain(">01</text>")
    expect(html).toContain(">frontend</text>")
    expect(html).toContain(
      'class="doc-diagram-fill-accent-tint doc-diagram-line-accent'
    )
  })

  test("more than seven layers and more than six pieces in one are reported", () => {
    const layers: { name: string; items?: string[] }[] = Array.from(
      { length: 8 },
      (_, index) => ({ name: `C${index}` })
    )
    layers[0] = { name: "C0", items: ["a", "b", "c", "d", "e", "f", "g"] }
    expect(problemsOf({ type: "layers", layers })).toEqual([
      "Una pila de capas lleva como mucho 7 capas y este tiene 8: pártelo en dos diagramas",
      "Una pila de capas lleva como mucho 6 piezas en una capa y este tiene 7: pártelo en dos diagramas",
    ])
  })

  test("its text version lists the layers in order with their notes and pieces", () => {
    expect(textOf(cleanDiagramOf(STACK))).toContain(
      "<ol><li>Aplicación (Astro): frontend, admin</li><li>API</li><li>Datos (PostgreSQL)</li></ol>"
    )
  })
})
