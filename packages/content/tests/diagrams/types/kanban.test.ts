import { describe, expect, test } from "bun:test"
import type { Diagram } from "#pages/diagrams"
import {
  cleanDiagramOf,
  htmlOf,
  problemsOf,
  textOf,
} from "#tests/pages/diagram-types/helpers"

const BOARD = {
  type: "kanban",
  columns: [
    { name: "Por hacer", cards: [{ name: "Login" }] },
    {
      name: "En curso",
      limit: 2,
      cards: [{ name: "Diagramas" }, { name: "Migración" }, { name: "Caché" }],
    },
    { name: "Hecho", limit: 3, cards: [] },
  ],
}

/** The texts of the count chips, with whether each is in the accent. */
function chips(diagram: Diagram): [string, boolean][] {
  return diagram.over.flatMap((graphic): [string, boolean][] => {
    if (graphic.kind !== "text" || graphic.role !== "label") return []
    return [[graphic.text, graphic.classes.includes("text-accent")]]
  })
}

describe("kanban", () => {
  test("a column over its limit shows its count against the limit in the accent", () => {
    expect(chips(cleanDiagramOf(BOARD))).toEqual([
      ["1", false],
      ["3 / 2", true],
      ["0 / 3", false],
    ])
  })

  test("cards stack in their column in order, and a board has no arrows", () => {
    const diagram = cleanDiagramOf(BOARD)
    const [, diagramas, migracion] = diagram.nodes
    expect(diagramas?.x).toBe(migracion?.x)
    expect(migracion?.y).toBeGreaterThan(
      (diagramas?.y ?? 0) + (diagramas?.h ?? 0)
    )
    expect(diagram.edges).toEqual([])
  })

  test("a blocked card is marked and counts as an accent", () => {
    const diagram = cleanDiagramOf({
      type: "kanban",
      columns: [
        { name: "En curso", cards: [{ name: "Migración", blocked: true }] },
      ],
    })
    expect(diagram.nodes[0]?.tag).toBe("Bloqueada")
    expect(htmlOf(diagram)).toContain(">Bloqueada</text>")
    expect(
      problemsOf({
        type: "kanban",
        columns: [
          {
            name: "En curso",
            limit: 1,
            cards: [
              { name: "A", blocked: true },
              { name: "B", blocked: true },
            ],
          },
        ],
      })
    ).toEqual([
      "Como mucho 2 elementos van en el color de acento y este diagrama tiene 3: deja solo lo que el lector debe ver primero",
    ])
  })

  test("more than four cards in a column is over budget", () => {
    expect(
      problemsOf({
        type: "kanban",
        columns: [
          {
            name: "Backlog",
            cards: ["a", "b", "c", "d", "e"].map((name) => ({ name })),
          },
        ],
      })
    ).toEqual([
      "Un kanban lleva como mucho 4 tarjetas en una columna y este tiene 5: pártelo en dos diagramas",
    ])
  })

  test("its text version gives each column's count and cards", () => {
    expect(textOf(cleanDiagramOf(BOARD))).toContain(
      "<li>En curso (3 / 2, por encima del límite): Diagramas, Migración, Caché</li>"
    )
  })
})
