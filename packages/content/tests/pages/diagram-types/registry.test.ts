import { describe, expect, test } from "bun:test"
import {
  catalogWithNas,
  diagramOf,
  htmlOf,
  problemsOf,
  readTyped,
  textOf,
} from "#tests/pages/diagram-types/helpers"

const FLOW = {
  type: "flowchart",
  steps: [
    { id: "a", name: "Uno" },
    { id: "b", name: "Dos" },
  ],
  links: [{ from: "a", to: "b", label: "SIGUE" }],
}

describe("typed diagram files", () => {
  test("an unknown type is reported listing the types, and nothing is drawn", () => {
    const read = readTyped({ type: "mindmap" })
    expect(read.diagram).toBeNull()
    const [message] = read.problems.map((problem) => problem.message)
    expect(message).toStartWith(
      "type: `mindmap` no es ningún tipo de diagrama ("
    )
    expect(message).toContain("flowchart")
  })

  test("a key of another form is reported with the keys the type accepts", () => {
    expect(problemsOf({ ...FLOW, nodes: [] })).toEqual([
      "`nodes` no es una clave de un diagrama de flujo ($schema, type, title, desc, variant, steps, links)",
    ])
  })

  test("a variant on a type without variants is reported and the diagram still drawn", () => {
    const read = readTyped({ ...FLOW, variant: "grande" })
    expect(read.problems.map((problem) => problem.message)).toEqual([
      "variant: Este tipo de diagrama no tiene variantes",
    ])
    expect(read.diagram?.type).toBe("flowchart")
  })

  test("a missing description is reported like on any diagram", () => {
    const read = readTyped({ ...FLOW, desc: undefined })
    expect(read.problems.map((problem) => problem.message)).toEqual([
      "desc: Falta: es obligatorio",
    ])
  })

  test("a typed diagram is drawn with its own legend and text version", () => {
    const diagram = diagramOf(FLOW)
    const html = htmlOf(diagram)
    expect(html).toContain('<figure class="doc-diagram" data-diagram="d"')
    expect(html).toContain('<svg class="doc-diagram-svg"')
    expect(html).toContain(">Paso</text>")
    expect(textOf(diagram)).toContain("<li>Uno → Dos: SIGUE</li>")
  })

  test("an item standing for an entity is named and linked by it, and counts among the entity's diagrams", () => {
    const diagram = diagramOf(
      {
        ...FLOW,
        steps: [
          { id: "a", entity: "maquinas/nas" },
          { id: "b", name: "Dos" },
        ],
      },
      { catalog: catalogWithNas(), pages: new Set([""]) }
    )
    expect(diagram.nodes[0]?.name).toBe("NAS")
    expect(diagram.entities.map((entity) => entity.id)).toEqual(["nas"])
    expect(textOf(diagram)).toContain(
      '<li><a href="/casa/catalogo/maquinas/nas">NAS</a> → Dos: SIGUE</li>'
    )
  })
})

describe("typed items", () => {
  test("a reference to an item that does not exist is reported and its link left out", () => {
    const read = readTyped({
      ...FLOW,
      links: [{ from: "a", to: "z" }],
    })
    expect(read.problems.map((problem) => problem.message)).toEqual([
      "links.0.to: `z` no es ninguna de las partes del diagrama",
    ])
    expect(read.diagram?.edges).toEqual([])
  })

  test("an entity that does not exist is reported and the item left unlinked", () => {
    const read = readTyped({
      ...FLOW,
      steps: [
        { id: "a", name: "Uno", entity: "maquinas/viejo" },
        { id: "b", name: "Dos" },
      ],
    })
    expect(read.problems.map((problem) => problem.message)).toEqual([
      "steps.0.entity: `maquinas/viejo` no es ninguna entidad del catálogo",
    ])
    expect(read.diagram?.nodes[0]?.link).toBeNull()
  })

  test("a repeated id is reported on the second item", () => {
    expect(
      problemsOf({
        ...FLOW,
        steps: [
          { id: "a", name: "Uno" },
          { id: "a", name: "Otro" },
        ],
        links: [],
      })
    ).toContain("steps.1.id: `a` ya es el id de otra parte")
  })

  test("an item linking to a page that does not exist is reported", () => {
    expect(
      problemsOf({
        ...FLOW,
        steps: [
          { id: "a", name: "Uno", page: "red/vpn" },
          { id: "b", name: "Dos", page: "red" },
        ],
      })
    ).toEqual(["steps.0.page: `red/vpn` no es ninguna página de docs/"])
  })
})
