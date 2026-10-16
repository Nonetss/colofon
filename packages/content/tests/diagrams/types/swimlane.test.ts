import { describe, expect, test } from "bun:test"
import {
  boxOf,
  cleanDiagramOf,
  problemsOf,
  textOf,
} from "#tests/diagrams/types/helpers"

const ORDER = {
  type: "swimlane",
  lanes: [
    { id: "cliente", name: "Cliente" },
    { id: "cocina", name: "Cocina" },
  ],
  steps: [
    { id: "pide", name: "Pide", lane: "cliente" },
    { id: "prepara", name: "Prepara", lane: "cocina" },
  ],
  links: [{ from: "pide", to: "prepara", label: "COMANDA" }],
}

describe("swimlane", () => {
  test("a handoff crosses from one band to the other, its target one column to the right", () => {
    const diagram = cleanDiagramOf(ORDER)
    const pide = boxOf(diagram, "pide")
    const prepara = boxOf(diagram, "prepara")
    expect(prepara.x).toBeGreaterThan(pide.x + pide.w)
    expect(prepara.y).toBeGreaterThan(pide.y + pide.h)
    const [cliente, cocina] = diagram.zones
    expect(cliente?.label).toBe("CLIENTE")
    expect(pide.zone).toBe("cliente")
    expect(prepara.zone).toBe("cocina")
    const ys = (diagram.edges[0]?.points ?? []).map(([, y]) => y)
    expect(Math.min(...ys)).toBeLessThan((cliente?.y ?? 0) + (cliente?.h ?? 0))
    expect(Math.max(...ys)).toBeGreaterThan(cocina?.y ?? 0)
  })

  test("two steps of one lane never share a column", () => {
    const diagram = cleanDiagramOf({
      ...ORDER,
      steps: [
        ...ORDER.steps,
        { id: "paga", name: "Paga", lane: "cliente", col: 0 },
      ],
    })
    expect(boxOf(diagram, "paga").x).not.toBe(boxOf(diagram, "pide").x)
  })

  test("the process variant draws what enters, leaves and is used under a step", () => {
    const diagram = cleanDiagramOf({
      ...ORDER,
      variant: "process",
      steps: [
        { ...ORDER.steps[0], outputs: ["pedido"] },
        { ...ORDER.steps[1], inputs: ["comanda"], tools: ["horno", "plancha"] },
      ],
    })
    const chips = diagram.over.flatMap((graphic) => {
      if (graphic.kind !== "text") return []
      return [graphic.text]
    })
    expect(chips).toEqual([
      "SALE pedido",
      "ENTRA comanda",
      "CON horno, plancha",
    ])
  })

  test("in the process variant, steps of a lane share their centre line and links leave the box, not its chips", () => {
    const diagram = cleanDiagramOf({
      type: "swimlane",
      variant: "process",
      lanes: [{ id: "autor", name: "Autor" }],
      steps: [
        {
          id: "cabecera",
          name: "Cabecera",
          lane: "autor",
          outputs: ["titulo"],
        },
        {
          id: "cuerpo",
          name: "Cuerpo",
          lane: "autor",
          inputs: ["cabecera"],
          tools: ["Markdown"],
        },
      ],
      links: [{ from: "cabecera", to: "cuerpo" }],
    })
    const cabecera = boxOf(diagram, "cabecera")
    const cuerpo = boxOf(diagram, "cuerpo")
    expect(cabecera.y).toBe(cuerpo.y)
    const [start] = diagram.edges[0]?.points ?? []
    expect(start).toEqual([
      cabecera.x + cabecera.w,
      cabecera.y + cabecera.h / 2,
    ])
  })

  test("inputs without the process variant and an unknown lane are reported", () => {
    expect(
      problemsOf({
        ...ORDER,
        steps: [
          { ...ORDER.steps[0], inputs: ["x"] },
          { id: "otro", name: "Otro", lane: "sala" },
          ORDER.steps[1],
        ],
      })
    ).toEqual([
      'steps.0.inputs: inputs es de la variante process: añade "variant": "process"',
      "steps.1.lane: `sala` no es ninguno de los carriles",
    ])
  })

  test("more than five lanes is over budget", () => {
    const lanes = Array.from({ length: 6 }, (_, index) => ({
      id: `l${index}`,
      name: `L${index}`,
    }))
    expect(
      problemsOf({
        type: "swimlane",
        lanes,
        steps: [{ id: "a", name: "A", lane: "l0" }],
      })
    ).toEqual([
      "Un diagrama de carriles lleva como mucho 5 carriles y este tiene 6: pártelo en dos diagramas",
    ])
  })

  test("its text version lists the steps per lane, then the links", () => {
    const text = textOf(cleanDiagramOf(ORDER))
    expect(text).toContain("<li>Cliente: Pide</li><li>Cocina: Prepara</li>")
    expect(text).toContain("<li>Pide → Prepara: COMANDA</li>")
  })
})
