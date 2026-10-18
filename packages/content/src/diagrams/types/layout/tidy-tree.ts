// A tidy tree (tree, org chart): each level on its own row, siblings in
// written order side by side, every parent centred over its children, and
// each subtree as wide as it needs so no two boxes overlap. Laid out
// downwards; `direction: "right"` swaps the axes.

export type TreeNode = {
  id: string
  /** The box's size along the level (its width going down). */
  breadth: number
  children: TreeNode[]
}

export type Placed = {
  id: string
  /** The centre along the level, from 0. */
  centre: number
  depth: number
}

/** The space between two neighbouring subtrees. */
const SIBLING_GAP = 24

/** Each node's centre along its level and its depth. */
export function tidyTree(root: TreeNode): {
  placed: Placed[]
  /** How wide the whole tree is along the levels. */
  extent: number
  depth: number
} {
  const placed: Placed[] = []
  let deepest = 0
  const lay = (node: TreeNode, left: number, depth: number): number => {
    deepest = Math.max(deepest, depth)
    const width = spanOf(node)
    if (node.children.length === 0) {
      placed.push({ id: node.id, centre: left + width / 2, depth })
      return width
    }
    const childrenWidth = childrenSpan(node)
    let at = left + (width - childrenWidth) / 2
    const centres: number[] = []
    for (const child of node.children) {
      const before = placed.length
      const used = lay(child, at, depth + 1)
      const own = placed.slice(before).find((entry) => entry.id === child.id)
      if (own !== undefined) centres.push(own.centre)
      at += used + SIBLING_GAP
    }
    placed.push({
      id: node.id,
      centre: middleOf(centres, left + width / 2),
      depth,
    })
    return width
  }
  const extent = lay(root, 0, 0)
  return { placed, extent, depth: deepest }
}

/** How wide a subtree is: its own box, or its children side by side. */
function spanOf(node: TreeNode): number {
  return Math.max(node.breadth, childrenSpan(node))
}

function childrenSpan(node: TreeNode): number {
  if (node.children.length === 0) return 0
  const widths = node.children.map(spanOf)
  return (
    widths.reduce((sum, width) => sum + width, 0) +
    SIBLING_GAP * (widths.length - 1)
  )
}

/** Halfway between the first and last of `centres`; `fallback` with none. */
function middleOf(centres: readonly number[], fallback: number): number {
  const first = centres[0]
  const last = centres.at(-1)
  if (first === undefined || last === undefined) return fallback
  return (first + last) / 2
}
