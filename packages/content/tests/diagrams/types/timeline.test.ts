import { describe, expect, test } from "bun:test"
import type { Diagram } from "#pages/diagrams"
import {
  cleanDiagramOf,
  problemsOf,
  textOf,
} from "#tests/pages/diagram-types/helpers"

/** The x of each event's dot, in date order. */
function dots(diagram: Diagram): number[] {
  const xs: number[] = []
  for (const graphic of diagram.over)
    if (graphic.kind === "circle" && graphic.datum !== null) xs.push(graphic.cx)
  return xs
}

const EVENTS = [
  { name: "Inicio", date: "2026-01-01" },
  { name: "Beta", date: "2026-02-01" },
  { name: "Lanzamiento", date: "2026-07-01" },
]

describe("timeline", () => {
  test("events are placed by their dates: five months take about five times one month", () => {
    const [a = 0, b = 0, c = 0] = dots(
      cleanDiagramOf({ type: "timeline", events: EVENTS })
    )
    const ratio = (c - b) / (b - a)
    expect(ratio).toBeGreaterThan(4.6)
    expect(ratio).toBeLessThan(5.4)
  })

  test("with scale even they are spaced equally, in date order", () => {
    const [a = 0, b = 0, c = 0] = dots(
      cleanDiagramOf({
        type: "timeline",
        scale: "even",
        events: [EVENTS[2], EVENTS[0], EVENTS[1]],
      })
    )
    expect(c - b).toBeCloseTo(b - a)
  })

  test("a focal event is a bigger accent dot and the legend names it", () => {
    const diagram = cleanDiagramOf({
      type: "timeline",
      events: [EVENTS[0], { ...EVENTS[1], focal: true }],
    })
    const focal = diagram.over.find(
      (graphic) =>
        graphic.kind === "circle" && graphic.classes.includes("fill-accent")
    )
    expect(focal?.kind === "circle" && focal.r).toBe(6)
    expect(diagram.legend?.map((entry) => entry.name)).toEqual([
      "Evento",
      "Hito principal",
    ])
  })

  test("labels close together go to opposite sides and never overlap", () => {
    const diagram = cleanDiagramOf({
      type: "timeline",
      events: [
        { name: "Uno muy largo", date: "2026-01-01" },
        { name: "Dos muy largo", date: "2026-01-02" },
        { name: "Tres muy largo", date: "2026-01-03" },
        { name: "Fin", date: "2026-12-01" },
      ],
    })
    const names = diagram.over.filter(
      (graphic) => graphic.kind === "text" && graphic.role === "item"
    )
    const ys = names.map((graphic) => (graphic.kind === "text" ? graphic.y : 0))
    expect(new Set(ys.slice(0, 3)).size).toBe(3)
  })

  test("a span that ends before it starts is reported and left out", () => {
    expect(
      problemsOf({
        type: "timeline",
        events: EVENTS,
        spans: [{ name: "Beta", start: "2026-03-01", end: "2026-02-01" }],
      })
    ).toEqual(["spans.0.end: Un periodo termina después de empezar"])
  })

  test("a bad date is reported and its event left out", () => {
    expect(
      problemsOf({
        type: "timeline",
        events: [...EVENTS, { name: "Nunca", date: "2026-02-30" }],
      })
    ).toEqual(["events.3.date: Es una fecha AAAA-MM-DD o AAAA-MM que exista"])
  })

  test("more than twelve events is over budget", () => {
    const events = Array.from({ length: 13 }, (_, index) => ({
      name: `E${index}`,
      date: `2026-${String((index % 12) + 1).padStart(2, "0")}-01`,
    }))
    expect(problemsOf({ type: "timeline", events, scale: "even" })).toContain(
      "Una línea de tiempo lleva como mucho 12 eventos y este tiene 13: pártelo en dos diagramas"
    )
  })

  test("its text version lists the events in date order", () => {
    expect(
      textOf(
        cleanDiagramOf({ type: "timeline", events: [EVENTS[2], EVENTS[0]] })
      )
    ).toContain("<li>1 ene 2026: Inicio</li><li>1 jul 2026: Lanzamiento</li>")
  })
})
