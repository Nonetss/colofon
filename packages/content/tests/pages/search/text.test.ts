import { describe, expect, test } from "bun:test"
import type { ElementContent, Root } from "hast"
import { foldTerm, sectionsOf, tokensOf } from "#pages/search/text"

function element(
  tagName: string,
  children: ElementContent[],
  properties: Record<string, string> = {}
): ElementContent {
  return { type: "element", tagName, properties, children }
}

function text(value: string): ElementContent {
  return { type: "text", value }
}

function root(...children: ElementContent[]): Root {
  return { type: "root", children }
}

describe("sectionsOf", () => {
  test("splits the body at headings with an id, keeping the text above the first one", () => {
    const tree = root(
      element("p", [text("Intro de la red.")]),
      element("h2", [text("Zonas")], { id: "zonas" }),
      element("p", [text("Una zona por sitio.")]),
      element("h3", [text("Inversa")], { id: "inversa" }),
      element("p", [text("Resolución inversa.")])
    )
    expect(sectionsOf(tree)).toEqual([
      { anchor: null, heading: "", text: "Intro de la red." },
      { anchor: "zonas", heading: "Zonas", text: "Una zona por sitio." },
      { anchor: "inversa", heading: "Inversa", text: "Resolución inversa." },
    ])
  })

  test("leaves out an empty text above the first heading", () => {
    const tree = root(
      element("h2", [text("Zonas")], { id: "zonas" }),
      element("p", [text("Texto.")])
    )
    expect(sectionsOf(tree).map((section) => section.anchor)).toEqual(["zonas"])
  })

  test("separates blocks but keeps inline elements inside their words", () => {
    const tree = root(
      element("p", [text("con"), element("strong", [text("figura")])]),
      element("ul", [
        element("li", [text("uno")]),
        element("li", [text("dos")]),
      ])
    )
    expect(sectionsOf(tree)[0]?.text).toBe("configura uno dos")
  })

  test("skips scripts and styles, and finds headings nested in other elements", () => {
    const tree = root(
      element("style", [text(".x{}")]),
      element("section", [
        element("h2", [text("Dentro")], { id: "dentro" }),
        element("p", [text("Texto")]),
      ])
    )
    expect(sectionsOf(tree)).toEqual([
      { anchor: "dentro", heading: "Dentro", text: "Texto" },
    ])
  })

  test("a heading without an id stays in the body", () => {
    const tree = root(
      element("h2", [text("Suelto")]),
      element("p", [text("x")])
    )
    expect(sectionsOf(tree)).toEqual([
      { anchor: null, heading: "", text: "Suelto x" },
    ])
  })

  test("a page without a tree has no sections", () => {
    expect(sectionsOf(null)).toEqual([])
  })
})

describe("tokensOf", () => {
  test("gives each word its place in the text and its folded form", () => {
    const value = "La Configuración, ñu"
    const tokens = tokensOf(value)
    expect(tokens.map((token) => token.term)).toEqual([
      "la",
      "configuracion",
      "nu",
    ])
    expect(tokens.map((token) => value.slice(token.start, token.end))).toEqual([
      "La",
      "Configuración",
      "ñu",
    ])
  })

  test("keeps decomposed accents inside their word", () => {
    const value = "Sincronizacio\u0301n lista"
    const tokens = tokensOf(value)
    expect(tokens.map((token) => token.term)).toEqual([
      "sincronizacion",
      "lista",
    ])
    expect(value.slice(tokens[0]?.start, tokens[0]?.end)).toBe(
      "Sincronizacio\u0301n"
    )
  })
})

describe("foldTerm", () => {
  test("lowercases and drops diacritics", () => {
    expect(foldTerm("ÁRBOL Pingüino")).toBe("arbol pinguino")
  })
})
