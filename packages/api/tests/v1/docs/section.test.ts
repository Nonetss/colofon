import { describe, expect, test } from "bun:test"
import type { Element, Root } from "hast"
import { sectionTree } from "#v1/docs/section"

function el(
  tagName: string,
  properties: Element["properties"],
  children: Element["children"] = []
): Element {
  return { type: "element", tagName, properties, children }
}

function heading(tagName: "h2" | "h3", id: string): Element {
  return el(tagName, { id }, [{ type: "text", value: id }])
}

function paragraph(value: string): Element {
  return el("p", {}, [{ type: "text", value }])
}

const tree: Root = {
  type: "root",
  children: [
    paragraph("intro"),
    heading("h2", "inversa"),
    paragraph("inversa body"),
    heading("h3", "ptr"),
    paragraph("ptr body"),
    heading("h3", "zonas"),
    paragraph("zonas body"),
    heading("h2", "caches"),
    paragraph("caches body"),
    el("div", {}, [heading("h3", "anidada")]),
  ],
}

function ids(section: Root | null): unknown[] {
  if (section === null) return []
  return section.children.map((node) => {
    if (node.type !== "element") return node.type
    if (node.tagName === "p") return node.children
    return node.properties.id
  })
}

describe("sectionTree", () => {
  test("a level 2 section keeps its level 3 subsections and stops at the next h2", () => {
    expect(ids(sectionTree(tree, "inversa"))).toEqual([
      "inversa",
      [{ type: "text", value: "inversa body" }],
      "ptr",
      [{ type: "text", value: "ptr body" }],
      "zonas",
      [{ type: "text", value: "zonas body" }],
    ])
  })

  test("a level 3 section stops at the next h3", () => {
    expect(ids(sectionTree(tree, "ptr"))).toEqual([
      "ptr",
      [{ type: "text", value: "ptr body" }],
    ])
  })

  test("a level 3 section stops at the next h2", () => {
    expect(ids(sectionTree(tree, "zonas"))).toEqual([
      "zonas",
      [{ type: "text", value: "zonas body" }],
    ])
  })

  test("the last section runs to the end of the page", () => {
    const section = sectionTree(tree, "caches")
    expect(section?.children).toHaveLength(3)
  })

  test("an unknown id or a heading nested in another element is no section", () => {
    expect(sectionTree(tree, "no-existe")).toBeNull()
    expect(sectionTree(tree, "anidada")).toBeNull()
  })

  test("a paragraph with the id is not a heading", () => {
    const withId: Root = { type: "root", children: [el("p", { id: "x" })] }
    expect(sectionTree(withId, "x")).toBeNull()
  })
})
