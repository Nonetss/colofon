import { describe, expect, test } from "bun:test"
import type { Diagram } from "#pages/diagrams"
import {
  cleanDiagramOf,
  diagramOf,
  problemsOf,
  textOf,
} from "#tests/pages/diagram-types/helpers"

const PLAN = {
  type: "gantt",
  phases: [
    {
      name: "Diseño",
      tasks: [
        { name: "Investigación", start: "2026-01-05", end: "2026-01-30" },
        { name: "Beta", milestone: "2026-03-02" },
      ],
    },
    {
      name: "Construcción",
      tasks: [{ name: "Backend", start: "2026-02-02", end: "2026-06-30" }],
    },
  ],
}

function tickLabels(diagram: Diagram): string[] {
  return diagram.under.flatMap((graphic) => {
    if (graphic.kind !== "text" || graphic.role !== "tick") return []
    return [graphic.text]
  })
}

/** The mark (bar or diamond) of the task labelled `label`. */
function markOf(diagram: Diagram, label: string) {
  const found = diagram.over.find((graphic) => graphic.datum?.label === label)
  if (found === undefined) throw new Error(`No mark ${label}`)
  return found
}

describe("gantt", () => {
  test("half a year ticks once per month, January to June", () => {
    expect(tickLabels(cleanDiagramOf(PLAN))).toEqual([
      "ene 2026",
      "feb",
      "mar",
      "abr",
      "may",
      "jun",
    ])
  })

  test("a few weeks tick once per week", () => {
    const labels = tickLabels(
      cleanDiagramOf({
        type: "gantt",
        phases: [
          {
            name: "Sprint",
            tasks: [{ name: "Tarea", start: "2026-03-02", end: "2026-03-27" }],
          },
        ],
      })
    )
    expect(labels).toEqual(["2 mar", "9 mar", "16 mar", "23 mar"])
  })

  test("a task is a bar from its start to the end of its last day, a milestone a diamond", () => {
    const diagram = cleanDiagramOf(PLAN)
    const bar = markOf(diagram, "Investigación")
    const backend = markOf(diagram, "Backend")
    expect(bar.kind).toBe("rect")
    expect(
      backend.kind === "rect" && bar.kind === "rect" && bar.x < backend.x
    ).toBe(true)
    expect(markOf(diagram, "Beta").kind).toBe("polygon")
    expect(bar.datum?.value).toBe("5 ene 2026 – 30 ene 2026")
    expect(bar.datum?.series).toBe("Diseño")
  })

  test("today is a dashed line with its label", () => {
    const diagram = cleanDiagramOf({ ...PLAN, today: "2026-03-10" })
    expect(
      diagram.over.some(
        (graphic) => graphic.kind === "text" && graphic.text === "HOY"
      )
    ).toBe(true)
    expect(diagram.legend?.map((entry) => entry.name)).toContain("Hoy")
  })

  test("a bad date is reported on the task and the task left out", () => {
    const spec = {
      type: "gantt",
      phases: [
        {
          name: "Diseño",
          tasks: [
            { name: "Mala", start: "2026-13-01", end: "2026-12-31" },
            { name: "Buena", start: "2026-01-01", end: "2026-01-31" },
          ],
        },
      ],
    }
    expect(problemsOf(spec)).toContain(
      "phases.0.tasks.0.start: Es una fecha AAAA-MM-DD o AAAA-MM que exista"
    )
    expect(
      diagramOf(spec).over.filter((graphic) => graphic.datum !== null)
    ).toHaveLength(1)
  })

  test("a task that ends before it starts is reported", () => {
    expect(
      problemsOf({
        type: "gantt",
        phases: [
          {
            name: "Diseño",
            tasks: [
              { name: "Al revés", start: "2026-03-01", end: "2026-02-01" },
            ],
          },
        ],
      })
    ).toEqual(["phases.0.tasks.0.end: La tarea termina antes de empezar"])
  })

  test("more than sixteen tasks is over budget", () => {
    const tasks = Array.from({ length: 17 }, (_, index) => ({
      name: `T${index}`,
      start: "2026-01-01",
      end: "2026-01-10",
    }))
    expect(
      problemsOf({ type: "gantt", phases: [{ name: "Todo", tasks }] })
    ).toEqual([
      "Un diagrama de Gantt lleva como mucho 16 tareas y este tiene 17: pártelo en dos diagramas",
    ])
  })

  test("its text version lists each phase's tasks with their dates", () => {
    expect(textOf(cleanDiagramOf(PLAN))).toContain(
      "<li>Diseño<ul><li>Investigación: 5 ene 2026 – 30 ene 2026</li><li>Beta: 2 mar 2026</li></ul></li>"
    )
  })
})
