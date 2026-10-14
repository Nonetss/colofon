import { traceServiceLabel } from "@/features/admin/traces/shared"
import { foldText } from "@/lib/fold-text"

/** A root span name picked as a whole: `POST /rpc/v1/cron/list`. */
export interface RootNameLeaf {
  name: string
  /** What tells it apart under its path: the method, else the name. */
  label: string
}

/** The root span names of the traces one service started, as
 *  `traces.rootNames` groups them; `""` for kept names no longer listed. */
export interface RootNameGroup {
  service: string
  names: readonly string[]
}

/**
 * A node of the root span name tree. The tree's root holds one `service`
 * node per root service (Frontend, Backend, Worker…). Below each, `segment`
 * nodes follow the names' paths (`/rpc` → `v1` → `cron`), or the words of a
 * name that isn't a route (`db` → `user`): each holds the names that end
 * there, one per method or action, and the deeper segments. A service
 * node's own names are single words.
 */
export interface RootNameNode {
  kind: "root" | "service" | "segment"
  /** A key unique in the tree: the service, then the path up to here
   *  (`backend:/rpc/v1`); `""` for the root. */
  path: string
  /** What the row shows: the service's name, `/rpc` right under it, then
   *  the bare segment (`v1`). */
  label: string
  segment: string
  children: RootNameNode[]
  leaves: RootNameLeaf[]
}

/** `GET /admin/traces` or `/admin/traces`: an optional method, then a path. */
const ROUTE_PATTERN = /^(?:([A-Z]+) )?(\/\S*)$/

interface ParsedName {
  /** Path segments for a route (`rpc`, `v1`), words for any other name
   *  (`db`, `user`). */
  segments: string[]
  route: boolean
  label: string
}

/**
 * A name that isn't a route nests by its words, like a route by its path:
 * the first word groups it (`cron.run`, `db`), the last word is what it acts
 * on and the words between are the action, as a route's method is. So
 * `db create account` sits at `db` → `account` as `create`, and
 * `cron.run health.check` at `cron.run` as `health.check`. A single word
 * stays whole.
 */
function parseWords(name: string): ParsedName {
  const words = name.split(" ").filter((word) => word !== "")
  const [first, ...rest] = words
  const last = rest.at(-1)
  if (first === undefined || last === undefined) {
    return { segments: [], route: false, label: name }
  }
  if (rest.length === 1) return { segments: [first], route: false, label: last }
  return {
    segments: [first, last],
    route: false,
    label: rest.slice(0, -1).join(" "),
  }
}

function parseName(name: string): ParsedName {
  const route = ROUTE_PATTERN.exec(name)
  const path = route?.[2]
  if (route === null || path === undefined) return parseWords(name)
  const segments = path.split("/").filter((segment) => segment !== "")
  // `GET /` has no segment to hang from: it stays whole at the root.
  if (segments.length === 0) return { segments, route: true, label: name }
  const method = route[1]
  if (method === undefined) return { segments, route: true, label: path }
  return { segments, route: true, label: method }
}

/** The label of a group's service: names kept from another range or a
 *  link, which Tempo no longer lists, go under "Otras". */
function serviceLabelOf(service: string): string {
  if (service === "") return "Otras"
  return traceServiceLabel(service)
}

/** A route segment right under its service reads as the path it starts
 *  (`/rpc`); a deeper one, or a word, as itself (`v1`, `db`). */
function segmentLabelOf(
  parent: RootNameNode,
  segment: string,
  route: boolean
): string {
  if (route && parent.kind === "service") return `/${segment}`
  return segment
}

function childOf(
  node: RootNameNode,
  segment: string,
  route: boolean
): RootNameNode {
  // Routes and words keep apart even when they share a segment (`/db`, `db`).
  const separator = route ? "/" : " "
  const path = `${node.path}${separator}${segment}`
  const existing = node.children.find((child) => child.path === path)
  if (existing) return existing
  const child: RootNameNode = {
    kind: "segment",
    path,
    label: segmentLabelOf(node, segment, route),
    segment,
    children: [],
    leaves: [],
  }
  node.children.push(child)
  return child
}

function serviceNodeOf(group: RootNameGroup): RootNameNode {
  const node: RootNameNode = {
    kind: "service",
    path: `${group.service}:`,
    label: serviceLabelOf(group.service),
    segment: group.service,
    children: [],
    leaves: [],
  }
  for (const name of new Set(group.names)) {
    const { segments, route, label } = parseName(name)
    let parent = node
    for (const segment of segments) parent = childOf(parent, segment, route)
    parent.leaves.push({ name, label })
  }
  sortNode(node)
  return node
}

function byText(a: string, b: string): number {
  return a.localeCompare(b)
}

function sortNode(node: RootNameNode) {
  // By label, so routes (`/api`, `/rpc`) come before words (`cron.run`).
  node.children.sort((a, b) => byText(a.label, b.label))
  node.leaves.sort((a, b) => byText(a.label, b.label))
  for (const child of node.children) sortNode(child)
}

/** The groups as a tree: one node per service, in the groups' order, and
 *  under each the names' path segments, alphabetical at each level. */
export function buildRootNameTree(
  groups: readonly RootNameGroup[]
): RootNameNode {
  const children = groups
    .filter((group) => group.names.length > 0)
    .map(serviceNodeOf)
  return {
    kind: "root",
    path: "",
    label: "",
    segment: "",
    children,
    leaves: [],
  }
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
 * with `foldText`), or the whole service whose name does, and the segments
 * that still hold one; `null` when none is left.
 */
export function matchingTree(
  node: RootNameNode,
  folded: string
): RootNameNode | null {
  if (folded === "") return node
  // Searching for a service ("worker") keeps its whole group.
  if (node.kind === "service" && foldText(node.label).includes(folded)) {
    return node
  }
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
