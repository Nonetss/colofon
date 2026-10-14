import { foldText } from "@/lib/fold-text"

/** A root span name picked as a whole: `POST /rpc/v1/cron/list`. */
export interface RootNameLeaf {
  name: string
  /** What tells it apart under its path: the method, else the name. */
  label: string
}

/**
 * One path segment of the root span names (`/rpc` → `v1` → `cron`): the
 * names whose path ends here, one per method, and the deeper segments. The
 * tree's root has no segment, and holds the names that aren't a route
 * (`cron.run`).
 */
export interface RootNameNode {
  /** The path up to here (`/rpc/v1`); `""` for the root. */
  path: string
  segment: string
  children: RootNameNode[]
  leaves: RootNameLeaf[]
}

/** `GET /admin/traces` or `/admin/traces`: an optional method, then a path. */
const ROUTE_PATTERN = /^(?:([A-Z]+) )?(\/\S*)$/

interface ParsedName {
  segments: string[]
  label: string
}

function parseName(name: string): ParsedName {
  const route = ROUTE_PATTERN.exec(name)
  const path = route?.[2]
  if (route === null || path === undefined) return { segments: [], label: name }
  const segments = path.split("/").filter((segment) => segment !== "")
  // `GET /` has no segment to hang from: it stays whole at the root.
  if (segments.length === 0) return { segments, label: name }
  const method = route[1]
  if (method === undefined) return { segments, label: path }
  return { segments, label: method }
}

function emptyNode(path: string, segment: string): RootNameNode {
  return { path, segment, children: [], leaves: [] }
}

function childOf(node: RootNameNode, segment: string): RootNameNode {
  const existing = node.children.find((child) => child.segment === segment)
  if (existing) return existing
  const child = emptyNode(`${node.path}/${segment}`, segment)
  node.children.push(child)
  return child
}

function byText(a: string, b: string): number {
  return a.localeCompare(b)
}

function sortNode(node: RootNameNode) {
  node.children.sort((a, b) => byText(a.segment, b.segment))
  node.leaves.sort((a, b) => byText(a.label, b.label))
  for (const child of node.children) sortNode(child)
}

/** The names as a tree of their path segments, alphabetical at each level. */
export function buildRootNameTree(names: readonly string[]): RootNameNode {
  const root = emptyNode("", "")
  for (const name of new Set(names)) {
    const { segments, label } = parseName(name)
    let node = root
    for (const segment of segments) node = childOf(node, segment)
    node.leaves.push({ name, label })
  }
  sortNode(root)
  return root
}

/** Every name in the node and below it. */
export function namesUnder(node: RootNameNode): string[] {
  return [
    ...node.leaves.map((leaf) => leaf.name),
    ...node.children.flatMap(namesUnder),
  ]
}

/**
 * The node keeping only the names that contain `folded` (already folded
 * with `foldText`), and the segments that still hold one; `null` when none
 * is left.
 */
export function matchingTree(
  node: RootNameNode,
  folded: string
): RootNameNode | null {
  if (folded === "") return node
  const leaves = node.leaves.filter((leaf) =>
    foldText(leaf.name).includes(folded)
  )
  const children: RootNameNode[] = []
  for (const child of node.children) {
    const kept = matchingTree(child, folded)
    if (kept) children.push(kept)
  }
  if (leaves.length === 0 && children.length === 0) return null
  return { ...node, leaves, children }
}

export type TreeCheckState = "checked" | "unchecked" | "partial"

/** Whether every, none or some of `names` are selected. */
export function checkStateOf(
  names: readonly string[],
  selected: ReadonlySet<string>
): TreeCheckState {
  const kept = names.filter((name) => selected.has(name)).length
  if (kept === 0) return "unchecked"
  if (kept === names.length) return "checked"
  return "partial"
}

/** The selection after toggling a group of names: all of them in, unless
 *  they all were, then all of them out. */
export function toggleNames(
  selected: readonly string[],
  names: readonly string[]
): string[] {
  const current = new Set(selected)
  if (checkStateOf(names, current) === "checked") {
    for (const name of names) current.delete(name)
  } else {
    for (const name of names) current.add(name)
  }
  return [...current]
}
