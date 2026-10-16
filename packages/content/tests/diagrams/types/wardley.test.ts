import { describe, expect, test } from "bun:test"
import {
  cleanDiagramOf,
  htmlOf,
  problemsOf,
  textOf,
} from "#tests/pages/diagram-types/helpers"

const MAP = {
  type: "wardley",
  components: [
    { id: "usuario", name: "Usuario", visibility: 95, evolution: 55 },
    { id: "orquestacion", name: "Orquestación", visibility: 50, evolution: 20 },
    { id: "gpu", name: "GPU", visibility: 5, evolution: 90 },
  ],
  links: [
    { from: "usuario", to: "orquestacion" },
    { from: "orquestacion", to: "gpu" },
  ],
  moves: [{ id: "orquestacion", to: 55 }],
}

describe("wardley", () => {
  test("the x axis is split into the four stages and a move is a dashed accent arrow", () => {
    const html = htmlOf(cleanDiagramOf(MAP))
    for (const stage of ["GÉNESIS", "A MEDIDA", "PRODUCTO", "COMMODITY"])
      expect(html).toContain(`>${stage}</text>`)
    expect(html).toContain(
      'class="doc-diagram-line-accent doc-diagram-line-dash"'
    )
    expect(html).toContain(">Evoluciona</text>")
  })

  test("a component out of range is reported and left out", () => {
    expect(
      problemsOf({
        ...MAP,
        components: [
          ...MAP.components,
          { id: "x", name: "X", visibility: 140, evolution: 10 },
        ],
      })
    ).toEqual(["components.3.visibility: Va de 0 a 100"])
  })

  test("a move backwards and a link to an unknown component are reported", () => {
    expect(
      problemsOf({
        ...MAP,
        links: [{ from: "usuario", to: "nube" }],
        moves: [{ id: "gpu", to: 40 }],
      })
    ).toEqual([
      "links.0.to: `nube` no es ninguno de los componentes",
      "moves.0.to: Un componente solo evoluciona hacia commodity: to va a la derecha de su evolution",
    ])
  })

  test("more than two moves are reported", () => {
    expect(
      problemsOf({
        ...MAP,
        moves: [
          { id: "usuario", to: 80 },
          { id: "orquestacion", to: 55 },
          { id: "gpu", to: 95 },
        ],
      })
    ).toContain(
      "Un mapa de Wardley lleva como mucho 2 movimientos y este tiene 3: pártelo en dos diagramas"
    )
  })

  test("its text version gives each component's stage and visibility, and its dependencies", () => {
    const text = textOf(cleanDiagramOf(MAP))
    expect(text).toContain(
      "<li>Orquestación: Génesis, visibilidad media; evoluciona hacia Producto</li>"
    )
    expect(text).toContain("<li>Usuario depende de Orquestación</li>")
  })
})
