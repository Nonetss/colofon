import type { Root, RootContent } from "hast"

// One section of a page's tree, for `read` with a `#section` route: the
// heading with that id and what follows it up to the next heading of the
// same or a higher level. Only the root's own headings count, the ones the
// reader lists and `search` routes to.

const LEVELS: Record<string, number> = { h2: 2, h3: 3 }

/** The level of a top-level `h2`/`h3`, or null for anything else. */
function headingLevel(node: RootContent): number | null {
  if (node.type !== "element") return null
  return LEVELS[node.tagName] ?? null
}

function hasId(node: RootContent, id: string): boolean {
  return node.type === "element" && node.properties.id === id
}

/**
 * The section whose heading has `id`, as a tree of its own, or null when no
 * top-level `h2`/`h3` has that id.
 */
export function sectionTree(tree: Root, id: string): Root | null {
  const start = tree.children.findIndex(
    (node) => headingLevel(node) !== null && hasId(node, id)
  )
  const heading = tree.children[start]
  if (heading === undefined) return null
  const level = headingLevel(heading)
  if (level === null) return null
  const children: RootContent[] = [heading]
  for (const node of tree.children.slice(start + 1)) {
    const next = headingLevel(node)
    if (next !== null && next <= level) break
    children.push(node)
  }
  return { type: "root", children }
}
