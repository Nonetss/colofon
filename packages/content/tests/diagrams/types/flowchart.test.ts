import { describe, expect, test } from "bun:test"
import {
  boxOf,
  cleanDiagramOf,
  htmlOf,
  problemsOf,
  textOf,
} from "#tests/diagrams/types/helpers"

const REVIEW = {
  type: "flowchart",
  steps: [
    { id: "inicio", name: "Llega un PR", kind: "start" },
    { id: "revisa", name: "¿Pasa CI?", kind: "decision" },
    { id: "aprueba", name: "Aprobar" },
    { id: "rechaza", name: "Pedir cambios" },
  ],
  links: [
    { from: "inicio", to: "revisa" },
    { from: "revisa", to: "aprueba", label: "SÍ" },
    { from: "revisa", to: "rechaza", label: "NO" },
  ],
}

describe("flowchart", () => {
  test("rows follow the longest distance from the start, and a decision is a diamond", () => {
    const diagram = cleanDiagramOf(REVIEW)
    const inicio = boxOf(diagram, "inicio")
    const revisa = boxOf(diagram, "revisa")
    const aprueba = boxOf(diagram, "aprueba")
    const rechaza = boxOf(diagram, "rechaza")
    expect(inicio.y).toBeLessThan(revisa.y)
    expect(revisa.y + revisa.h).toBeLessThan(aprueba.y)
    expect(aprueba.y).toBe(rechaza.y)
    expect(aprueba.x).not.toBe(rechaza.x)
    expect(revisa.shape).toBe("diamond")
    expect(inicio.shape).toBe("pill")
    const labels = diagram.edges.map((edge) => edge.label)
    expect(labels).toEqual([null, "SÍ", "NO"])
  })

  test("a given row and column override the automatic ones", () => {
    const diagram = cleanDiagramOf({
      ...REVIEW,
      steps: REVIEW.steps.map((step) => {
        if (step.id === "rechaza") return { ...step, row: 3, col: 0 }
        return step
      }),
    })
    expect(boxOf(diagram, "rechaza").y).toBeGreaterThan(
      boxOf(diagram, "aprueba").y
    )
  })

  test("a link back up the chart is dashed and goes round the side", () => {
    const diagram = cleanDiagramOf({
      ...REVIEW,
      links: [...REVIEW.links, { from: "rechaza", to: "inicio" }],
    })
    const back = diagram.edges.at(-1)
    expect(back?.kind).toBe("dash")
    const right = Math.max(...diagram.nodes.map((node) => node.x + node.w))
    expect(Math.max(...(back?.points ?? []).map(([x]) => x))).toBeGreaterThan(
      right
    )
    expect(htmlOf(diagram)).toContain(">Vuelta / opcional</text>")
  })

  test("a decision with more than three exits is reported", () => {
    const exits = ["a", "b", "c", "d"]
    expect(
      problemsOf({
        type: "flowchart",
        steps: [
          { id: "q", name: "¿?", kind: "decision" },
          ...exits.map((id) => ({ id, name: id })),
        ],
        links: exits.map((id) => ({ from: "q", to: id })),
      })
    ).toEqual(['steps.0: La decisión "¿?" tiene 4 salidas: como mucho 3'])
  })

  test("a step without id is reported, since links name steps by it", () => {
    expect(
      problemsOf({ type: "flowchart", steps: [{ name: "Suelto" }] })
    ).toEqual(["steps.0: Falta id: las demás partes lo nombran por él"])
  })

  test("its text version lists every link with its label", () => {
    expect(textOf(cleanDiagramOf(REVIEW))).toContain(
      "<ul><li>Llega un PR → ¿Pasa CI?</li><li>¿Pasa CI? → Aprobar: SÍ</li><li>¿Pasa CI? → Pedir cambios: NO</li></ul>"
    )
  })
})
