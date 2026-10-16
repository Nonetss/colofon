import { describe, expect, test } from "bun:test"
import {
  cleanDiagramOf,
  problemsOf,
  textOf,
} from "#tests/diagrams/types/helpers"

const MAP = {
  type: "story-map",
  activities: [
    { id: "buscar", name: "Buscar" },
    { id: "comprar", name: "Comprar" },
  ],
  releases: ["MVP", "v2"],
  cut: "MVP",
  stories: [
    { name: "Por nombre", activity: "buscar", release: "MVP" },
    { name: "Carrito", activity: "comprar", release: "MVP" },
    { name: "Filtros", activity: "buscar", release: "v2" },
  ],
}

describe("story map", () => {
  test("the release cut is an accent line between the MVP row and the v2 row", () => {
    const diagram = cleanDiagramOf(MAP)
    const cut = diagram.over.find(
      (graphic) =>
        graphic.kind === "line" && graphic.classes.includes("line-accent")
    )
    if (cut === undefined || cut.kind !== "line") throw new Error("no cut")
    const mvp = diagram.nodes.find((node) => node.name === "Por nombre")
    const v2 = diagram.nodes.find((node) => node.name === "Filtros")
    expect(cut.y1).toBeGreaterThan((mvp?.y ?? 0) + (mvp?.h ?? 0))
    expect(cut.y1).toBeLessThan(v2?.y ?? 0)
  })

  test("stories sit in their activity's column, under the backbone", () => {
    const diagram = cleanDiagramOf(MAP)
    const buscar = diagram.nodes.find((node) => node.id === "buscar")
    const filtros = diagram.nodes.find((node) => node.name === "Filtros")
    expect(filtros?.x).toBe(buscar?.x)
    expect(filtros?.y).toBeGreaterThan(buscar?.y ?? 0)
  })

  test("an unknown activity, release or cut is reported", () => {
    expect(
      problemsOf({
        ...MAP,
        cut: "v3",
        stories: [
          { name: "A", activity: "pagar", release: "MVP" },
          { name: "B", activity: "buscar", release: "v9" },
        ],
      })
    ).toEqual([
      "stories.0.activity: `pagar` no es ninguna de las actividades",
      "stories.1.release: `v9` no es ninguna de las entregas (MVP, v2)",
      "cut: `v3` no es ninguna de las entregas (MVP, v2)",
    ])
  })

  test("more than three releases is over budget", () => {
    expect(problemsOf({ ...MAP, releases: ["MVP", "v2", "v3", "v4"] })).toEqual(
      [
        "Un mapa de historias lleva como mucho 3 entregas y este tiene 4: pártelo en dos diagramas",
      ]
    )
  })

  test("its text version lists each release's stories per activity and where the cut is", () => {
    const text = textOf(cleanDiagramOf(MAP))
    expect(text).toContain(
      "<li>MVP<ul><li>Buscar: Por nombre</li><li>Comprar: Carrito</li></ul></li>"
    )
    expect(text).toContain("<li>Corte de entrega tras MVP</li>")
  })
})
