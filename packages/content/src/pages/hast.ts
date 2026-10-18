import type { Element, ElementContent } from "hast"

// The hast pieces the page pipeline builds by hand: elements, text, links,
// the notice that stands in for a component that cannot render, and the
// text of a subtree.

export function element(
  tagName: string,
  properties: Element["properties"],
  children: ElementContent[]
): Element {
  return { type: "element", tagName, properties, children }
}

export function text(value: string): ElementContent {
  return { type: "text", value }
}

export function link(href: string, children: ElementContent[]): Element {
  return element("a", { href }, children)
}

/** The notice shown where the platform's `component` could not render. */
export function componentNotice(component: string, message: string): Element {
  return element(
    "div",
    { className: ["doc-component-notice"], dataComponent: component },
    [text(message)]
  )
}

/** The text of `content` and everything under it, as written. */
export function textOf(content: readonly ElementContent[]): string {
  return content
    .map((node) => {
      if (node.type === "text") return node.value
      if (node.type === "element") return textOf(node.children)
      return ""
    })
    .join("")
}
