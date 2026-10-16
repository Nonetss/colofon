import { describe, expect, test } from "bun:test"
import type { Diagram } from "#diagrams/model"
import {
  cleanDiagramOf,
  problemsOf,
  textOf,
} from "#tests/diagrams/types/helpers"

const SPEC = {
  type: "polar",
  categories: ["Lun", "Mar", "Mié", "Jue"],
  values: [10, 20, 0, 40],
  max: 40,
  focal: "Jue",
}

function marks(diagram: Diagram) {
  return diagram.over.filter((graphic) => graphic.datum !== null)
}

describe("polar", () => {
  test("each category is a wedge, none for a zero, the focal one in the accent", () => {
    const drawn = marks(cleanDiagramOf(SPEC))
    expect(drawn.map((graphic) => graphic.datum?.label)).toEqual([
      "Lun",
      "Mar",
      "Jue",
    ])
    expect(drawn.every((graphic) => graphic.kind === "path")).toBe(true)
    expect(drawn[2]?.classes).toContain("fill-accent-tint")
  })

  test("the lollipop variant draws a ray and a dot whose distance follows the value", () => {
    const drawn = marks(cleanDiagramOf({ ...SPEC, variant: "lollipop" }))
    const dots = drawn.filter((graphic) => graphic.kind === "circle")
    expect(dots).toHaveLength(3)
    const [lun] = dots
    if (lun === undefined || lun.kind !== "circle") throw new Error("none")
    // Lun is on the top spoke at a quarter of the scale: 35px above the centre.
    expect(lun.cx).toBe(380)
    expect(lun.cy).toBe(210 - 35)
  })

  test("a value above the scale or below zero is reported", () => {
    expect(problemsOf({ ...SPEC, values: [50, -1, 0, 40] })).toEqual([
      "values.0: 50 está por encima de max (40): se dibuja en 40",
      "values.1: -1 está por debajo de 0: se dibuja en 0",
    ])
  })

  test("fewer than 4 categories is refused and more than 8 over budget", () => {
    expect(
      problemsOf({
        type: "polar",
        categories: ["a", "b", "c"],
        values: [1, 2, 3],
      })
    ).toContain("categories: Un gráfico polar lleva al menos 4 categorías")
    const categories = Array.from({ length: 9 }, (_, index) => `c${index}`)
    expect(
      problemsOf({ type: "polar", categories, values: categories.map(() => 1) })
    ).toEqual([
      "Un gráfico polar lleva como mucho 8 categorías y este tiene 9: pártelo en dos diagramas",
    ])
  })

  test("its text version is a table of the values", () => {
    expect(textOf(cleanDiagramOf(SPEC))).toContain(
      "<tr><td>Mié</td><td>0</td></tr>"
    )
  })
})
