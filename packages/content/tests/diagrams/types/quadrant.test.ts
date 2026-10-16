import { describe, expect, test } from "bun:test"
import {
  cleanDiagramOf,
  diagramOf,
  htmlOf,
  problemsOf,
  textOf,
} from "#tests/pages/diagram-types/helpers"

const PRIORITIES = {
  type: "quadrant",
  x: { label: "Esfuerzo", low: "Poco", high: "Mucho" },
  y: { label: "Impacto", low: "Bajo", high: "Alto" },
  quadrants: ["Hacer ya", "Planificar", "Delegar", "Descartar"],
  items: [
    { name: "Caché de CI", x: 20, y: 85, focal: true },
    { name: "Rehacer login", x: 75, y: 20 },
  ],
}

describe("quadrant", () => {
  test("items are dots placed by x and y, labelled, the focal one in the accent", () => {
    const html = htmlOf(cleanDiagramOf(PRIORITIES))
    expect(html).toContain(">Caché de CI</text>")
    expect(html).toContain(">HACER YA</text>")
    expect(html).toContain(">MUCHO</text>")
    expect(html).toMatch(
      /<circle class="doc-diagram-fill-accent doc-diagram-mark" data-node="m0" data-label="Caché de CI" data-value="Hacer ya"/
    )
  })

  test("an item out of range is reported on its x and left out", () => {
    const spec = {
      ...PRIORITIES,
      items: [{ name: "Fuera", x: 120, y: 50 }, ...PRIORITIES.items],
    }
    expect(problemsOf(spec)).toEqual(["items.0.x: Va de 0 a 100"])
    expect(htmlOf(diagramOf(spec))).not.toContain(">Fuera</text>")
  })

  test("more than twelve items are reported", () => {
    const items = Array.from({ length: 13 }, (_, index) => ({
      name: `E${index}`,
      x: (index * 7) % 100,
      y: (index * 13) % 100,
    }))
    expect(problemsOf({ ...PRIORITIES, items })).toContain(
      "Un cuadrante lleva como mucho 12 elementos y este tiene 13: pártelo en dos diagramas"
    )
  })

  test("its text version names each item's quadrant", () => {
    expect(textOf(cleanDiagramOf(PRIORITIES))).toContain(
      "<li>Caché de CI: Hacer ya</li><li>Rehacer login: Descartar</li>"
    )
  })
})
