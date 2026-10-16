import { describe, expect, test } from "bun:test"
import type { Diagram } from "#pages/diagrams"
import {
  cleanDiagramOf,
  problemsOf,
  textOf,
} from "#tests/pages/diagram-types/helpers"

const SIGN_UP = {
  type: "journey",
  stages: [
    { name: "Descubre", sentiment: "bien", actions: ["Lee la web"] },
    {
      name: "Se registra",
      sentiment: "mal",
      actions: ["Rellena el form"],
      pain: "email tarda",
    },
    { name: "Usa", sentiment: "muy-bien", actions: ["Publica"] },
  ],
}

/** Each stage's dot, as drawn: its height and whether it is the trough. */
function dots(diagram: Diagram): { y: number; accent: boolean }[] {
  const found: { y: number; accent: boolean }[] = []
  for (const graphic of diagram.over)
    if (graphic.kind === "circle" && graphic.datum !== null)
      found.push({
        y: graphic.cy,
        accent: graphic.classes.includes("fill-accent"),
      })
  return found
}

describe("journey", () => {
  test("the sentiment curve dips at the second stage, its trough in the accent, and peaks at the third", () => {
    const [first, second, third] = dots(cleanDiagramOf(SIGN_UP))
    if (first === undefined || second === undefined || third === undefined)
      throw new Error("no dots")
    expect(second.y).toBeGreaterThan(first.y)
    expect(third.y).toBeLessThan(first.y)
    expect([first.accent, second.accent, third.accent]).toEqual([
      false,
      true,
      false,
    ])
  })

  test("a journey that never dips below neutral has no trough", () => {
    const diagram = cleanDiagramOf({
      type: "journey",
      stages: [
        { name: "A", sentiment: "neutral" },
        { name: "B", sentiment: "bien" },
      ],
    })
    expect(dots(diagram).some((dot) => dot.accent)).toBe(false)
  })

  test("a stage's pain is a dashed accent tag", () => {
    const diagram = cleanDiagramOf(SIGN_UP)
    const tag = diagram.over.find(
      (graphic) => graphic.kind === "text" && graphic.text === "EMAIL TARDA"
    )
    expect(tag?.classes).toContain("text-accent")
  })

  test("more than two pains is over budget", () => {
    const stages = ["a", "b", "c"].map((name) => ({
      name,
      sentiment: "mal",
      pain: "duele",
    }))
    expect(problemsOf({ type: "journey", stages })).toContain(
      "Un mapa de experiencia lleva como mucho 2 puntos de dolor y este tiene 3: pártelo en dos diagramas"
    )
  })

  test("an unknown sentiment is reported and the stage left out", () => {
    expect(
      problemsOf({
        type: "journey",
        stages: [...SIGN_UP.stages, { name: "Otra", sentiment: "fatal" }],
      })
    ).toHaveLength(1)
  })

  test("its text version gives each stage its sentiment, texts and pain", () => {
    expect(textOf(cleanDiagramOf(SIGN_UP))).toContain(
      "<li>Se registra: Mal<ul><li>hace: Rellena el form</li><li>dolor: email tarda</li></ul></li>"
    )
  })
})
