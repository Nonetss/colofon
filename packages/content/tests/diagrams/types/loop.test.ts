import { describe, expect, test } from "bun:test"
import {
  cleanDiagramOf,
  problemsOf,
  textOf,
} from "#tests/diagrams/types/helpers"

const FOUR = {
  type: "loop",
  steps: [
    { id: "capturar", name: "Capturar" },
    { id: "decidir", name: "Decidir" },
    { id: "actuar", name: "Actuar" },
    { id: "medir", name: "Medir" },
  ],
}

describe("loop", () => {
  test("four steps get four arrows, the last from the fourth back to the first", () => {
    const diagram = cleanDiagramOf(FOUR)
    expect(diagram.edges).toHaveLength(4)
    expect(diagram.edges.at(-1)).toMatchObject({
      from: "medir",
      to: "capturar",
    })
    expect(diagram.edges.every((edge) => edge.route === "curve")).toBe(true)
  })

  test("steps sit on a ring, the first at the top", () => {
    const diagram = cleanDiagramOf(FOUR)
    const [first] = diagram.nodes
    if (first === undefined) throw new Error("no steps")
    expect(Math.min(...diagram.nodes.map((node) => node.y))).toBe(first.y)
  })

  test("every step stays a full gap away from the hub, across or along", () => {
    const diagram = cleanDiagramOf({
      type: "loop",
      steps: ["Escribir", "Validar", "Publicar", "Leer", "Preguntar"].map(
        (name) => ({ name, sub: "una línea" })
      ),
      hub: { name: "Repositorio central", sub: "la única fuente" },
    })
    const hub = diagram.nodes.find((node) => node.id === "_centro")
    if (hub === undefined) throw new Error("no hub")
    for (const node of diagram.nodes) {
      if (node === hub) continue
      const across = Math.max(
        hub.x - (node.x + node.w),
        node.x - (hub.x + hub.w)
      )
      const along = Math.max(
        hub.y - (node.y + node.h),
        node.y - (hub.y + hub.h)
      )
      expect(Math.max(across, along)).toBeGreaterThanOrEqual(47.9)
    }
  })

  test("the steps that write to the hub do so along dashed arrows to it", () => {
    const diagram = cleanDiagramOf({
      ...FOUR,
      hub: { name: "Memoria" },
      writes: [0, 2],
    })
    const writes = diagram.edges.filter((edge) => edge.kind === "dash")
    expect(writes.map((edge) => [edge.from, edge.to])).toEqual([
      ["capturar", "_centro"],
      ["actuar", "_centro"],
    ])
  })

  test("a write from a step that does not exist, or without a hub, is reported", () => {
    expect(problemsOf({ ...FOUR, hub: { name: "M" }, writes: [7] })).toEqual([
      "writes.0: No hay ningún paso 7: van del 0 al 3",
    ])
    expect(problemsOf({ ...FOUR, writes: [0] })).toEqual([
      "writes: Sin hub no hay centro en el que escribir",
    ])
  })

  test("more than eight steps are reported, and fewer than three", () => {
    const steps = Array.from({ length: 9 }, (_, index) => ({
      name: `P${index}`,
    }))
    expect(problemsOf({ type: "loop", steps })).toEqual([
      "Un ciclo lleva como mucho 8 pasos y este tiene 9: pártelo en dos diagramas",
    ])
    expect(problemsOf({ type: "loop", steps: steps.slice(0, 2) })).toEqual([
      "steps: Un ciclo tiene al menos 3 pasos",
    ])
  })

  test("its text version closes the cycle and names the hub and who writes to it", () => {
    const text = textOf(
      cleanDiagramOf({ ...FOUR, hub: { name: "Memoria" }, writes: [3] })
    )
    expect(text).toContain(
      "<li>Capturar → Decidir → Actuar → Medir → Capturar</li><li>Centro: Memoria</li><li>Escriben en Memoria: Medir</li>"
    )
  })
})
