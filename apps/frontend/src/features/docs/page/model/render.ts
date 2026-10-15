import type { Element, ElementContent, Root, RootContent } from "hast"
import { toHtml } from "hast-util-to-html"

// Turns a page tree from the API (already sanitized by the backend) into the
// HTML the reader shows. Only presentation is added here: frames around code
// and tables, the copy button, anchors on headings, lazy images and new tabs
// for links that leave the site.

const ANCHORED_HEADINGS = new Set(["h2", "h3", "h4"])

function element(
  tagName: string,
  properties: Element["properties"],
  children: ElementContent[]
): Element {
  return { type: "element", tagName, properties, children }
}

function text(value: string): ElementContent {
  return { type: "text", value }
}

/** `language-yaml` → `yaml`, from a `<pre>`'s `<code>`. */
function languageOf(pre: Element): string | null {
  const [code] = pre.children
  if (code === undefined || code.type !== "element") return null
  const classes = code.properties.className
  if (!Array.isArray(classes)) return null
  for (const name of classes) {
    if (typeof name === "string" && name.startsWith("language-"))
      return name.slice("language-".length)
  }
  return null
}

function codeFrame(pre: Element): Element {
  const language = languageOf(pre)
  const label: ElementContent[] = []
  if (language !== null)
    label.push(
      element("span", { className: ["doc-code-language"] }, [text(language)])
    )
  return element("div", { className: ["doc-code"] }, [
    element("div", { className: ["doc-code-bar"], dataMdSkip: true }, [
      ...label,
      element(
        "button",
        { type: "button", className: ["doc-code-copy"], dataCopy: true },
        [text("Copiar")]
      ),
    ]),
    pre,
  ])
}

function tableFrame(table: Element): Element {
  return element("div", { className: ["typeset-scroll"] }, [table])
}

function isExternal(href: unknown): boolean {
  return typeof href === "string" && /^https?:\/\//i.test(href)
}

function withAnchor(heading: Element): Element {
  const id = heading.properties.id
  if (typeof id !== "string") return heading
  return {
    ...heading,
    children: [
      ...heading.children.map(decorate),
      element(
        "a",
        {
          href: `#${id}`,
          className: ["doc-anchor"],
          ariaLabel: "Enlace a esta sección",
        },
        [text("#")]
      ),
    ],
  }
}

function decorate(node: ElementContent): ElementContent {
  if (node.type !== "element") return node
  if (node.tagName === "pre") return codeFrame(node)
  if (node.tagName === "table")
    return tableFrame({ ...node, children: node.children.map(decorate) })
  if (ANCHORED_HEADINGS.has(node.tagName)) return withAnchor(node)
  if (node.tagName === "img")
    return { ...node, properties: { ...node.properties, loading: "lazy" } }
  if (node.tagName === "a" && isExternal(node.properties.href)) {
    return {
      ...node,
      properties: {
        ...node.properties,
        target: "_blank",
        rel: ["noopener", "noreferrer"],
      },
      children: node.children.map(decorate),
    }
  }
  return { ...node, children: node.children.map(decorate) }
}

function decorateRoot(node: RootContent): RootContent {
  if (node.type === "element") return decorate(node)
  return node
}

/** The HTML of a page tree, with the reader's frames and controls. */
export function renderPage(tree: Root): string {
  return toHtml({ type: "root", children: tree.children.map(decorateRoot) })
}
