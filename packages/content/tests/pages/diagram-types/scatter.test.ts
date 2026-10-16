import { describe, expect, test } from "bun:test"
import type { Graphic } from "#pages/diagram-types/scene"
import {
  cleanDiagramOf,
  diagramOf,
  htmlOf,
  problemsOf,
  textOf,
} from "#tests/pages/diagram-types/helpers"

/** The texts among `graphics`, in order. */
function textsOf(graphics: readonly Graphic[]): string[] {
  const texts: string[] = []
  for (const graphic of graphics)
    if (graphic.kind === "text") texts.push(graphic.text)
  return texts
}

const AXES = { x: { label: "Coste" }, y: { label: "Uso" } }

function marks(spec: Record<string, unknown>) {
  return diagramOf(spec).over.filter(
    (graphic) => graphic.kind === "circle" && graphic.datum !== null
  )
}

describe("scatter", () => {
  test("points are coloured by group, with a legend entry each", () => {
    const html = htmlOf(
      cleanDiagramOf({
        type: "scatter",
        ...AXES,
        points: [
          { x: 1, y: 2, group: "Core" },
          { x: 3, y: 4, group: "Extra" },
        ],
      })
    )
    expect(html).toContain('data-series="Core"')
    expect(html).toContain(
      '<g class="doc-diagram-legend-entry" data-series="Extra">'
    )
  })

  test("only focal and named points are labelled", () => {
    const diagram = cleanDiagramOf({
      type: "scatter",
      ...AXES,
      points: [
        { x: 1, y: 2, name: "Pagos" },
        { x: 3, y: 4, focal: true },
        { x: 5, y: 1 },
      ],
    })
    const labels = textsOf(diagram.over)
    expect(labels).toEqual(["PAGOS", "PUNTO 2"])
  })

  test("a bubble's area follows its size: size 4 has twice the radius of size 1", () => {
    const [big, small] = marks({
      type: "scatter",
      variant: "bubble",
      ...AXES,
      points: [
        { x: 1, y: 2, size: 4 },
        { x: 3, y: 4, size: 1 },
      ],
    })
    if (big?.kind !== "circle" || small?.kind !== "circle")
      throw new Error("bubbles are circles")
    expect(big.r).toBeCloseTo(2 * small.r)
  })

  test("a bubble without size is reported", () => {
    expect(
      problemsOf({
        type: "scatter",
        variant: "bubble",
        ...AXES,
        points: [{ x: 1, y: 2 }],
      })
    ).toEqual(["points.0.size: Una burbuja lleva size, un número mayor que 0"])
  })

  test("a beeswarm ignores y and pushes dots apart so none overlap", () => {
    const dots = marks({
      type: "scatter",
      variant: "beeswarm",
      x: { label: "Latencia" },
      points: [{ x: 10 }, { x: 10 }, { x: 10 }, { x: 10.1 }],
    })
    for (const a of dots)
      for (const b of dots) {
        if (a === b || a.kind !== "circle" || b.kind !== "circle") continue
        expect(Math.hypot(a.cx - b.cx, a.cy - b.cy)).toBeGreaterThanOrEqual(
          2 * a.r
        )
      }
  })

  test("a point without y is reported, and more than 60 points is over budget", () => {
    expect(
      problemsOf({ type: "scatter", ...AXES, points: [{ x: 1 }] })
    ).toEqual(["points.0.y: Falta: un punto lleva x e y"])
    expect(
      problemsOf({
        type: "scatter",
        ...AXES,
        points: Array.from({ length: 61 }, (_, index) => ({ x: index, y: 1 })),
      })
    ).toEqual([
      "Un gráfico de dispersión lleva como mucho 60 puntos y este tiene 61: pártelo en dos diagramas",
    ])
  })

  test("its text version tables the points", () => {
    expect(
      textOf(
        cleanDiagramOf({
          type: "scatter",
          ...AXES,
          points: [{ x: 1200, y: 2, name: "Pagos" }],
        })
      )
    ).toContain("<tr><td>Pagos</td><td>1.200</td><td>2</td></tr>")
  })

  test("the drawing widens so a labelled point at the right edge fits whole", () => {
    const diagram = cleanDiagramOf({
      type: "scatter",
      variant: "bubble",
      ...AXES,
      points: [
        { x: 0, y: 0, size: 1 },
        { x: 10, y: 5, size: 9, name: "Una sección de nombre largo" },
      ],
    })
    for (const graphic of diagram.over) {
      if (graphic.kind === "circle")
        expect(graphic.cx + graphic.r).toBeLessThanOrEqual(
          diagram.size?.width ?? 0
        )
    }
    expect(diagram.size?.width).toBeGreaterThan(600)
  })
})
