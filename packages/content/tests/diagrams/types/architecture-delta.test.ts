import { describe, expect, test } from "bun:test"
import {
  cleanDiagramOf,
  diagramOf,
  htmlOf,
  problemsOf,
  textOf,
} from "#tests/pages/diagram-types/helpers"

function box(id: string, x: number, y: number, extra = {}) {
  return { id, name: id, x, y, w: 100, h: 48, ...extra }
}

function link(from: string, to: string) {
  return {
    from,
    to,
    points: [
      [0, 0],
      [0, 10],
    ],
  }
}

function snapshot(nodes: unknown[], edges: unknown[] = [], extra = {}) {
  return { width: 400, height: 200, nodes, edges, ...extra }
}

function delta(before: unknown, after: unknown, extra = {}) {
  return { type: "architecture-delta", before, after, ...extra }
}

/** The text version's list items, as plain text. */
function ledger(spec: Record<string, unknown>): string[] {
  const text = textOf(cleanDiagramOf(spec))
  return [...text.matchAll(/<li>(.*?)<\/li>/g)].map(([, item]) =>
    (item ?? "").replace(/<[^>]+>/g, "")
  )
}

describe("architecture-delta", () => {
  test("an extracted service: the new box and its connection are added, the rest unchanged", () => {
    const spec = delta(
      snapshot([box("monolito", 20, 20)]),
      snapshot(
        [box("monolito", 20, 20), box("facturacion", 200, 20)],
        [link("monolito", "facturacion")]
      )
    )
    expect(ledger(spec)).toEqual([
      "AÑADIDO: facturacion",
      "AÑADIDO: monolito → facturacion",
      "SIN CAMBIOS: monolito",
    ])
  })

  test("a box only in before is removed and drawn dashed in Antes", () => {
    const spec = delta(
      snapshot([box("a", 20, 20), box("viejo", 200, 20)]),
      snapshot([box("a", 20, 20)])
    )
    expect(ledger(spec)).toEqual(["QUITADO: viejo", "SIN CAMBIOS: a"])
    const diagram = cleanDiagramOf(spec)
    const removed = diagram.nodes.filter((node) => node.id === "viejo")
    expect(removed.map((node) => node.kind)).toEqual(["optional"])
  })

  test("a retained box whose name or lines differ is changed, with the difference", () => {
    const spec = delta(
      snapshot([box("api", 20, 20, { sub: "v1" })]),
      snapshot([box("api", 20, 20, { sub: "v2" })])
    )
    expect(ledger(spec)).toEqual(["CAMBIADO: api (líneas: v1 → v2)"])
  })

  test("a retained box in another zone is moved, naming both zones", () => {
    const zones = [
      { id: "casa", x: 0, y: 0, w: 150, h: 100, label: "CASA" },
      { id: "nube", x: 200, y: 0, w: 150, h: 100, label: "NUBE" },
    ]
    const spec = delta(
      snapshot([box("nas", 20, 20, { zone: "casa" })], [], { zones }),
      snapshot([box("nas", 220, 20, { zone: "nube" })], [], { zones })
    )
    expect(ledger(spec)).toEqual(["MOVIDO: nas (zona: CASA → NUBE)"])
  })

  test("a connection that moves one end to a retained box is rewired, and its old self dashed", () => {
    const pieces = [box("a", 20, 20), box("b", 200, 20), box("c", 200, 120)]
    const spec = delta(
      snapshot(pieces, [link("a", "b")]),
      snapshot(pieces, [link("a", "c")])
    )
    expect(ledger(spec)).toEqual([
      "RECONECTADO: a → c (antes a → b)",
      "SIN CAMBIOS: a, b, c",
    ])
    const diagram = cleanDiagramOf(spec)
    expect(diagram.edges.map((edge) => edge.kind)).toEqual(["dash", "dash"])
    expect(diagram.edges.map((edge) => edge.index)).toEqual([0, 1])
  })

  test("a connection to a removed box is removed, not rewired", () => {
    const spec = delta(
      snapshot([box("a", 20, 20), box("b", 200, 20)], [link("a", "b")]),
      snapshot([box("a", 20, 20), box("c", 200, 20)], [link("a", "c")])
    )
    expect(ledger(spec)).toEqual([
      "QUITADO: b",
      "AÑADIDO: c",
      "QUITADO: a → b",
      "AÑADIDO: a → c",
      "SIN CAMBIOS: a",
    ])
  })

  test("a change note follows its entry, and a note for no box is reported", () => {
    const spec = delta(
      snapshot([box("a", 20, 20)]),
      snapshot([box("a", 20, 20), box("b", 200, 20)]),
      {
        changes: [
          { id: "b", note: "Ahora va aparte" },
          { id: "z", note: "Nada" },
        ],
      }
    )
    expect(problemsOf(spec)).toEqual([
      "changes.1.id: `z` no es ninguna caja de before ni de after",
    ])
    expect(textOf(diagramOf(spec))).toContain(
      "<li>AÑADIDO: b. Ahora va aparte</li>"
    )
  })

  test("Antes, Cambios and Después are drawn side by side, with the after boxes to the right", () => {
    const spec = delta(
      snapshot([box("a", 20, 20)]),
      snapshot([box("a", 20, 20), box("b", 200, 20)])
    )
    const diagram = cleanDiagramOf(spec)
    const [before, after] = diagram.nodes.filter((node) => node.id === "a")
    expect(after?.x).toBeGreaterThan((before?.x ?? 0) + 400)
    const html = htmlOf(diagram)
    for (const heading of [">ANTES<", ">CAMBIOS<", ">DESPUÉS<", ">+ AÑADIDO<"])
      expect(html).toContain(heading)
  })

  test("a snapshot's problems are reported under its key, and a missing one stops the drawing", () => {
    expect(
      problemsOf(
        delta(snapshot([box("a", 20, 20, { entity: "maquinas/x" })]), {
          width: 100,
          height: 100,
          nodes: [box("a", 0, 0)],
          orden: 1,
        })
      )
    ).toEqual([
      "before.nodes.0.entity: `maquinas/x` no es ninguna entidad del catálogo",
      "after: `orden` no es una clave de after (width, height, nodes, edges, zones, notes)",
    ])
    const missing = problemsOf({ type: "architecture-delta", before: {} })
    expect(missing).toContain("after: Falta: es obligatorio")
  })

  test("the panels' separators run down the whole drawing, also past a long ledger", () => {
    const small = { width: 200, height: 80 }
    const diagram = cleanDiagramOf(
      delta(
        { ...small, nodes: [box("a", 20, 20)] },
        {
          ...small,
          nodes: ["a", "b", "c", "d"].map((id, index) =>
            box(id, 20 + index, 20)
          ),
        }
      )
    )
    const size = diagram.size
    if (size === null) throw new Error("not drawn")
    expect(size.height).toBeGreaterThan(48 + 80 + 24)
    const separators = diagram.under.filter(
      (graphic) => graphic.kind === "line"
    )
    expect(separators).toHaveLength(2)
    for (const line of separators)
      if (line.kind === "line") expect(line.y2).toBe(size.height - 8)
  })
})
