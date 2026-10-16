import type { Element, ElementContent, Root, RootContent } from "hast"
import { toMdast } from "hast-util-to-mdast"
import { gfmToMarkdown } from "mdast-util-gfm"
import { toMarkdown } from "mdast-util-to-markdown"

// What "Copiar en Markdown" copies: the page's title, description and body,
// written back from the tree the reader renders. The platform's own notices
// (components it doesn't provide) are left out, `[!KIND]` alerts become
// quotes with their title in bold, as GitHub writes them by hand, and a
// diagram becomes its caption followed by its zones and connections, without
// its drawing.

export interface MarkdownSource {
  title: string
  description: string
  tree: Root | null
}

function hasClass(node: Element, name: string): boolean {
  const classes = node.properties.className
  return Array.isArray(classes) && classes.includes(name)
}

function element(tagName: string, children: ElementContent[]): Element {
  return { type: "element", tagName, properties: {}, children }
}

/** An alert's title paragraph, its text in bold. */
function boldTitle(node: ElementContent): ElementContent {
  if (node.type !== "element" || !hasClass(node, "doc-alert-title")) return node
  return element("p", [element("strong", node.children)])
}

/**
 * A diagram's part as Markdown: the caption as the paragraph that opens it,
 * the text version's lists as they are (out of the block that hides them on
 * screen), and nothing of the drawing.
 */
function diagramPart(node: ElementContent): ElementContent[] {
  if (node.type !== "element") return [node]
  if (node.tagName === "figcaption") return [element("p", node.children)]
  if (hasClass(node, "doc-diagram-canvas")) return []
  if (hasClass(node, "doc-diagram-text")) return node.children
  return [node]
}

function prepare(node: ElementContent): ElementContent[] {
  if (node.type !== "element") return [node]
  if (hasClass(node, "doc-component-notice")) return []
  const children = node.children.flatMap(prepare)
  if (hasClass(node, "doc-alert"))
    return [element("blockquote", children.map(boldTitle))]
  if (hasClass(node, "doc-diagram")) return children.flatMap(diagramPart)
  return [{ ...node, children }]
}

function prepareRoot(node: RootContent): RootContent[] {
  if (node.type === "element") return prepare(node)
  return [node]
}

/** The body alone as Markdown, without the title and description lines. */
export function bodyMarkdown(tree: Root | null): string {
  if (tree === null) return ""
  const mdast = toMdast({
    type: "root",
    children: tree.children.flatMap(prepareRoot),
  })
  return toMarkdown(mdast, {
    bullet: "-",
    fences: true,
    extensions: [gfmToMarkdown()],
  }).trim()
}

/** The page as Markdown, with reader routes (`/repo/page`) left relative. */
export function pageMarkdown({ title, description, tree }: MarkdownSource) {
  const parts = [`# ${title}`, description, bodyMarkdown(tree)]
  return `${parts.filter((part) => part !== "").join("\n\n")}\n`
}
