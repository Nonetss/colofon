import { describe, expect, test } from "bun:test"
import {
  boxOf,
  cleanDiagramOf,
  diagramOf,
  problemsOf,
  textOf,
} from "#tests/pages/diagram-types/helpers"

const ACTORS = [
  { id: "web", name: "Navegador" },
  { id: "api", name: "API" },
  { id: "db", name: "Base de datos" },
]

const LOGIN = {
  type: "sequence",
  actors: ACTORS,
  messages: [
    { from: "api", to: "db", label: "SELECT" },
    { from: "db", to: "api", label: "fila", kind: "return" },
  ],
}

function centreOf(diagram: ReturnType<typeof cleanDiagramOf>, id: string) {
  const box = boxOf(diagram, id)
  return box.x + box.w / 2
}

describe("sequence", () => {
  test("a return message is drawn dashed under the call, pointing back to the caller's lifeline", () => {
    const diagram = cleanDiagramOf(LOGIN)
    const [call, reply] = diagram.edges
    if (call === undefined || reply === undefined) throw new Error("no edges")
    expect(call.kind).toBe("default")
    expect(reply.kind).toBe("dash")
    const callY = call.points?.[0]?.[1] ?? 0
    const replyY = reply.points?.[0]?.[1] ?? 0
    expect(replyY).toBeGreaterThan(callY)
    const end = reply.points?.at(-1)?.[0] ?? 0
    expect(Math.abs(end - centreOf(diagram, "api"))).toBeLessThanOrEqual(1)
    expect(reply.from).toBe("db")
    expect(reply.to).toBe("api")
  })

  test("actors stand left to right in order, and an async message has an open head", () => {
    const diagram = cleanDiagramOf({
      ...LOGIN,
      messages: [{ from: "web", to: "db", label: "evento", kind: "async" }],
    })
    expect(centreOf(diagram, "web")).toBeLessThan(centreOf(diagram, "api"))
    expect(centreOf(diagram, "api")).toBeLessThan(centreOf(diagram, "db"))
    expect(diagram.edges[0]?.head).toBe("triangle")
  })

  test("a message to the same actor is a self-call loop with its label", () => {
    const diagram = cleanDiagramOf({
      ...LOGIN,
      messages: [{ from: "api", to: "api", label: "valida" }],
    })
    const [loop] = diagram.edges
    expect(loop?.points).toHaveLength(4)
    expect(loop?.label).toBe("valida")
  })

  test("a fragment is framed with its kind in a tab and its condition", () => {
    const diagram = cleanDiagramOf({
      ...LOGIN,
      fragments: [{ kind: "alt", label: "hay fila", first: 0, last: 1 }],
    })
    const texts = diagram.under.flatMap((graphic) => {
      if (graphic.kind !== "text") return []
      return [graphic.text]
    })
    expect(texts).toContain("ALT")
    expect(texts).toContain("[hay fila]")
  })

  test("overlapping fragments and a fragment nested two levels deep are reported", () => {
    const messages = Array.from({ length: 5 }, (_, index) => ({
      from: "web",
      to: "api",
      label: `m${index}`,
    }))
    expect(
      problemsOf({
        ...LOGIN,
        messages,
        fragments: [
          { kind: "loop", first: 0, last: 2 },
          { kind: "opt", first: 1, last: 3 },
        ],
      })
    ).toEqual([
      "fragments.1: Se solapa con el fragmento de fragments.0: uno va dentro del otro o separados",
    ])
    expect(
      problemsOf({
        ...LOGIN,
        messages,
        fragments: [
          { kind: "loop", first: 0, last: 4 },
          { kind: "opt", first: 1, last: 3 },
          { kind: "alt", first: 2, last: 2 },
        ],
      })
    ).toEqual(["fragments.2: Los fragmentos se anidan un nivel como mucho"])
  })

  test("a message to an unknown actor is reported and left out", () => {
    const read = diagramOf({
      ...LOGIN,
      messages: [{ from: "web", to: "cache", label: "GET" }],
    })
    expect(read.edges).toEqual([])
    expect(
      problemsOf({
        ...LOGIN,
        messages: [{ from: "web", to: "cache", label: "GET" }],
      })
    ).toEqual(["messages.0.to: `cache` no es ninguno de los actores"])
  })

  test("more than six actors is over budget", () => {
    const actors = Array.from({ length: 7 }, (_, index) => ({
      id: `a${index}`,
      name: `A${index}`,
    }))
    expect(
      problemsOf({
        type: "sequence",
        actors,
        messages: [{ from: "a0", to: "a1", label: "x" }],
      })
    ).toEqual([
      "Un diagrama de secuencia lleva como mucho 6 actores y este tiene 7: pártelo en dos diagramas",
    ])
  })

  test("its text version numbers the messages and puts each fragment before its first one", () => {
    const text = textOf(
      cleanDiagramOf({
        ...LOGIN,
        fragments: [{ kind: "opt", label: "con caché", first: 1, last: 1 }],
      })
    )
    expect(text).toContain(
      "<li>1. API → Base de datos: SELECT</li><li>[opt: con caché]</li><li>2. Base de datos → API: fila</li>"
    )
  })
})
