import { describe, expect, test } from "bun:test"
import type { Diagram } from "#diagrams/model"
import {
  cleanDiagramOf,
  diagramOf,
  problemsOf,
  textOf,
} from "#tests/diagrams/types/helpers"

/** The rectangles of the data marks, by their label. */
function areas(diagram: Diagram): Map<string, number> {
  const found = new Map<string, number>()
  for (const graphic of diagram.over) {
    if (graphic.datum === null || graphic.kind !== "rect") continue
    found.set(graphic.datum.label, (graphic.w + 4) * (graphic.h + 4))
  }
  return found
}

function widths(diagram: Diagram): Map<string, number> {
  const found = new Map<string, number>()
  for (const graphic of diagram.over) {
    if (graphic.datum === null || graphic.kind !== "rect") continue
    found.set(graphic.datum.label, graphic.w)
  }
  return found
}

describe("treemap", () => {
  test("each rectangle's area follows its value", () => {
    const drawn = areas(
      cleanDiagramOf({
        type: "treemap",
        items: [
          { name: "Grande", value: 3 },
          { name: "Pequeño", value: 1 },
        ],
      })
    )
    const ratio = (drawn.get("Grande") ?? 0) / (drawn.get("Pequeño") ?? 1)
    expect(ratio).toBeCloseTo(3, 0)
  })

  test("a value that is not positive is reported and its item left out", () => {
    const spec = {
      type: "treemap",
      items: [
        { name: "Bien", value: 3 },
        { name: "Mal", value: 0 },
      ],
    }
    expect(problemsOf(spec)).toEqual([
      "items.1.value: Es un número mayor que 0",
    ])
    expect([...areas(diagramOf(spec)).keys()]).toEqual(["Bien"])
  })

  test("items are framed by their group, and the focal one is in the accent", () => {
    const diagram = cleanDiagramOf({
      type: "treemap",
      items: [
        { name: "Fotos", value: 4, group: "Personal", focal: true },
        { name: "Logs", value: 1, group: "Sistema" },
      ],
    })
    const focal = diagram.over.find(
      (graphic) => graphic.datum?.label === "Fotos"
    )
    expect(focal?.classes).toContain("fill-accent-tint")
    const titles: string[] = []
    for (const graphic of diagram.over)
      if (graphic.kind === "text") titles.push(graphic.text)
    expect(titles).toContain("PERSONAL")
    expect(titles).toContain("SISTEMA")
  })

  test("more than 16 items is over budget", () => {
    const items = Array.from({ length: 17 }, (_, index) => ({
      name: `p${index}`,
      value: index + 1,
    }))
    expect(problemsOf({ type: "treemap", items })).toEqual([
      "Un treemap lleva como mucho 16 partes y este tiene 17: pártelo en dos diagramas",
    ])
  })

  test("its text version lists each item with its value and share", () => {
    expect(
      textOf(
        cleanDiagramOf({
          type: "treemap",
          unit: "GB",
          items: [
            { name: "A", value: 3 },
            { name: "B", value: 1 },
          ],
        })
      )
    ).toContain(
      "<tbody><tr><td>A</td><td>3 GB</td><td>75 %</td></tr><tr><td>B</td><td>1 GB</td><td>25 %</td></tr></tbody>"
    )
  })
})

describe("marimekko", () => {
  const SPEC = {
    type: "treemap",
    variant: "marimekko",
    columns: [
      {
        name: "web",
        parts: [
          { name: "linux", value: 30 },
          { name: "mac", value: 10 },
        ],
      },
      { name: "api", parts: [{ name: "linux", value: 20 }] },
    ],
  }

  test("column widths follow their totals and each column is split by its parts", () => {
    const diagram = cleanDiagramOf(SPEC)
    const drawn = widths(diagram)
    const web = drawn.get("linux · web") ?? 0
    const api = drawn.get("linux · api") ?? 1
    expect(web / api).toBeCloseTo(2, 1)
    const heights = new Map<string, number>()
    for (const graphic of diagram.over)
      if (graphic.datum !== null && graphic.kind === "rect")
        heights.set(graphic.datum.label, graphic.h)
    expect(
      (heights.get("linux · web") ?? 0) / (heights.get("mac · web") ?? 1)
    ).toBeCloseTo(3, 1)
  })

  test("items in a marimekko are reported", () => {
    expect(problemsOf({ ...SPEC, items: [{ name: "x", value: 1 }] })).toContain(
      "items: Un marimekko lleva columns, no items"
    )
  })

  test("more than 5 parts in a column is reported", () => {
    const parts = Array.from({ length: 6 }, (_, index) => ({
      name: `p${index}`,
      value: 1,
    }))
    expect(
      problemsOf({
        type: "treemap",
        variant: "marimekko",
        columns: [{ name: "web", parts }],
      })
    ).toEqual([
      'columns.0: Una columna de un marimekko lleva como mucho 5 partes y "web" tiene 6: pártelo en dos diagramas',
    ])
  })

  test("its text version gives each part's share of its column", () => {
    expect(textOf(cleanDiagramOf(SPEC))).toContain(
      "<tr><td>web</td><td>mac</td><td>10</td><td>25 %</td></tr>"
    )
  })
})
