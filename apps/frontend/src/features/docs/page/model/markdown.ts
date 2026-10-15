import type { Element, ElementContent, Root, RootContent } from "hast"
import { toMdast } from "hast-util-to-mdast"
import { gfmToMarkdown } from "mdast-util-gfm"
import { toMarkdown } from "mdast-util-to-markdown"

// What "Copiar en Markdown" copies: the page's title, description and body,
// written back from the tree the reader renders. The platform's own notices
// (components it doesn't provide) are left out, and `[!KIND]` alerts become
// quotes with their title in bold, as GitHub writes them by hand.

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

function prepare(node: ElementContent): ElementContent[] {
  if (node.type !== "element") return [node]
  if (hasClass(node, "doc-component-notice")) return []
  const children = node.children.flatMap(prepare)
  if (hasClass(node, "doc-alert"))
    return [element("blockquote", children.map(boldTitle))]
  return [{ ...node, children }]
}

function prepareRoot(node: RootContent): RootContent[] {
  if (node.type === "element") return prepare(node)
  return [node]
}

function body(tree: Root | null): string {
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
  const parts = [`# ${title}`, description, body(tree)]
  return `${parts.filter((part) => part !== "").join("\n\n")}\n`
}
