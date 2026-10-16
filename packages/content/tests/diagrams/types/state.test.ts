import { describe, expect, test } from "bun:test"
import {
  boxOf,
  cleanDiagramOf,
  htmlOf,
  problemsOf,
  textOf,
} from "#tests/pages/diagram-types/helpers"

const ORDER = {
  type: "state",
  states: [
    { id: "nuevo", name: "Nuevo", initial: true },
    { id: "retrying", name: "Reintentando" },
    { id: "enviado", name: "Enviado", final: true },
  ],
  transitions: [
    { from: "nuevo", to: "retrying", label: "FALLO" },
    { from: "retrying", to: "retrying", label: "FALLO" },
    { from: "retrying", to: "enviado", label: "PAGO OK" },
  ],
}

describe("state machine", () => {
  test("a transition from a state to itself is a self-loop labelled with its event", () => {
    const diagram = cleanDiagramOf(ORDER)
    const loop = diagram.edges.find(
      (edge) => edge.from === "retrying" && edge.to === "retrying"
    )
    const box = boxOf(diagram, "retrying")
    expect(loop?.label).toBe("FALLO")
    const points = loop?.points ?? []
    expect(points[0]).toEqual([box.x + box.w - 24, box.y])
    expect(Math.max(...points.map(([x]) => x))).toBeGreaterThan(box.x + box.w)
  })

  test("states are rounded, laid from the initial one, with a dot before it and a ringed dot after a final one", () => {
    const diagram = cleanDiagramOf(ORDER)
    expect(diagram.nodes.map((node) => node.shape)).toEqual([
      "rounded",
      "rounded",
      "rounded",
    ])
    expect(boxOf(diagram, "nuevo").y).toBeLessThan(boxOf(diagram, "retrying").y)
    expect(boxOf(diagram, "retrying").y).toBeLessThan(
      boxOf(diagram, "enviado").y
    )
    const circles = diagram.under.filter((shape) => shape.kind === "circle")
    // The start dot, and the end ring with its core.
    expect(circles).toHaveLength(3)
    const html = htmlOf(diagram)
    expect(html).toContain(">Inicio</text>")
    expect(html).toContain(">Fin</text>")
  })

  test("more than eight states or fourteen transitions are reported", () => {
    const states = Array.from({ length: 9 }, (_, index) => ({
      id: `s${index}`,
      name: `S${index}`,
    }))
    expect(problemsOf({ type: "state", states })).toEqual([
      "Una máquina de estados lleva como mucho 8 estados y este tiene 9: pártelo en dos diagramas",
    ])
  })

  test("a transition to a state that does not exist is reported and left out", () => {
    expect(
      problemsOf({
        ...ORDER,
        transitions: [{ from: "nuevo", to: "perdido" }],
      })
    ).toEqual([
      "transitions.0.to: `perdido` no es ninguna de las partes del diagrama",
    ])
  })

  test("its text version lists every transition", () => {
    expect(textOf(cleanDiagramOf(ORDER))).toContain(
      "<ul><li>Nuevo → Reintentando: FALLO</li><li>Reintentando → Reintentando: FALLO</li><li>Reintentando → Enviado: PAGO OK</li></ul>"
    )
  })
})
