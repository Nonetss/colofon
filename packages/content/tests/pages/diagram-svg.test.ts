import { describe, expect, test } from "bun:test"
import type { Element } from "hast"
import { sanitize } from "hast-util-sanitize"
import { toHtml } from "hast-util-to-html"
import { LUCIDE_ICON_NAMES } from "#lucide-icons.generated"
import { iconNode } from "#pages/diagram-svg"
import { SANITIZE_SCHEMA } from "#pages/to-hast"

function svg(children: Element["children"], properties = {}): Element {
  return {
    type: "element",
    tagName: "svg",
    properties: { className: ["doc-diagram-svg"], ...properties },
    children,
  }
}

function shape(tagName: string, properties: Element["properties"]): Element {
  return { type: "element", tagName, properties, children: [] }
}

describe("diagram icons", () => {
  test("every icon name the platform accepts can be drawn", () => {
    const missing = LUCIDE_ICON_NAMES.filter(
      (name) => iconNode(name) === undefined
    )
    expect(missing).toEqual([])
  })
})

describe("the sanitizer and a diagram's SVG", () => {
  test("keeps the drawing's shapes, text, classes and links", () => {
    const tree = svg(
      [
        shape("rect", {
          className: ["doc-diagram-node-box"],
          x: "1",
          y: "2",
          width: "3",
          height: "4",
          rx: "8",
        }),
        shape("path", { className: ["doc-diagram-line"], d: "M0 0 L1 1" }),
      ],
      { viewBox: "0 0 10 10", role: "img", ariaLabel: "Red" }
    )
    expect(toHtml(sanitize(tree, SANITIZE_SCHEMA))).toBe(
      '<svg class="doc-diagram-svg" viewBox="0 0 10 10" role="img" aria-label="Red"><rect class="doc-diagram-node-box" x="1" y="2" width="3" height="4" rx="8"></rect><path class="doc-diagram-line" d="M0 0 L1 1"></path></svg>'
    )
  })

  test("strips styles, handlers, foreign classes, foreign elements and javascript links", () => {
    const tree = svg([
      shape("rect", {
        id: "x",
        style: "fill:red",
        onClick: "alert(1)",
        className: ["evil"],
      }),
      {
        type: "element",
        tagName: "a",
        properties: { href: "javascript:alert(1)" },
        children: [shape("path", { d: "M0 0" })],
      },
      shape("foreignObject", {}),
      shape("use", { href: "#x" }),
    ])
    const html = toHtml(sanitize(tree, SANITIZE_SCHEMA))
    expect(html).toContain('<a><path d="M0 0"></path></a>')
    for (const removed of [
      "style",
      "onclick",
      "evil",
      "javascript",
      "foreignObject",
      "<use",
    ])
      expect(html).not.toContain(removed)
  })
})
