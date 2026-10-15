import type { AppRouterClient } from "@nonete/api/router"

/** The reader's navigation, as `v1.docs.nav` answers it. */
export type DocsNav = Awaited<ReturnType<AppRouterClient["v1"]["docs"]["nav"]>>

export type DocsRepository = DocsNav["repositories"][number]

export type DocsNavNode = DocsRepository["nodes"][number]

/** A group of the repository's `menu.yaml`: a heading, not a route. */
export type DocsNavGroup = Extract<DocsNavNode, { kind: "group" }>

/** A page or section: a node with a route. */
export type DocsNavLink = Exclude<DocsNavNode, { kind: "group" }>

/** A page as the navbar search lists it. */
export type DocsPageEntry = {
  href: string
  label: string
  description: string
  /** The repository (in "Todos"), the group and the sections above the page. */
  trail: string[]
}

/**
 * Every page of `repositories`, home included, depth first. `withRepository`
 * starts each trail with the repository's name, for the "Todos" scope.
 */
export function flattenPages(
  repositories: readonly DocsRepository[],
  withRepository: boolean
): DocsPageEntry[] {
  const entries: DocsPageEntry[] = []
  for (const repository of repositories) {
    const base = repositoryTrail(repository, withRepository)
    if (repository.home !== null) {
      entries.push({
        href: repository.home.href,
        label: repository.home.title,
        description: repository.home.description,
        trail: base,
      })
    }
    collect(repository.nodes, base, entries)
  }
  return entries
}

function repositoryTrail(
  repository: DocsRepository,
  withRepository: boolean
): string[] {
  if (!withRepository) return []
  return [repository.name]
}

function collect(
  nodes: readonly DocsNavNode[],
  trail: string[],
  entries: DocsPageEntry[]
) {
  for (const node of nodes) {
    if (node.kind === "group") {
      collect(node.children, [...trail, node.title], entries)
      continue
    }
    entries.push({
      href: node.href,
      label: node.title,
      description: node.description,
      trail,
    })
    if (node.kind === "section")
      collect(node.children, [...trail, node.title], entries)
  }
}

/**
 * The hrefs of the sections that hold `pathname`, outermost first, so the
 * sidebar can open them. Groups are headings, always open: they are passed
 * through.
 */
export function sectionsAbove(
  nodes: readonly DocsNavNode[],
  pathname: string
): string[] {
  for (const node of nodes) {
    if (node.kind === "page") continue
    if (node.kind === "group") {
      const inGroup = sectionsAbove(node.children, pathname)
      if (inGroup.length > 0) return inGroup
      continue
    }
    if (node.href === pathname) return [node.href]
    if (holds(node.children, pathname))
      return [node.href, ...sectionsAbove(node.children, pathname)]
  }
  return []
}

function holds(nodes: readonly DocsNavNode[], pathname: string): boolean {
  return nodes.some((node) => {
    if (node.kind === "group") return holds(node.children, pathname)
    if (node.href === pathname) return true
    if (node.kind !== "section") return false
    return holds(node.children, pathname)
  })
}

/** How many pages `node` holds: itself (unless a group) and every page under it. */
function pagesIn(node: DocsNavNode): number {
  if (node.kind === "page") return 1
  const own = node.kind === "section" ? 1 : 0
  return node.children.reduce((total, child) => total + pagesIn(child), own)
}

/**
 * The fact a section's card shows: how many pages it holds, itself included
 * ("5 fichas"). A page has none.
 */
export function pagesMeta(node: DocsNavNode): string | undefined {
  if (node.kind === "page") return undefined
  const count = pagesIn(node)
  if (count === 1) return "1 ficha"
  return `${count} fichas`
}

/** Cards under an optional heading: a group of the menu, or loose entries. */
export type CardBlock = {
  group: DocsNavGroup | null
  links: DocsNavLink[]
}

/**
 * The top-level entries of a navigation as blocks of cards: one per group of
 * the menu, headed by it, and one per run of loose sections and pages.
 */
export function cardBlocks(nodes: readonly DocsNavNode[]): CardBlock[] {
  const blocks: CardBlock[] = []
  let loose: DocsNavLink[] = []
  for (const node of nodes) {
    if (node.kind !== "group") {
      loose.push(node)
      continue
    }
    if (loose.length > 0) blocks.push({ group: null, links: loose })
    loose = []
    blocks.push({ group: node, links: linksOf(node.children) })
  }
  if (loose.length > 0) blocks.push({ group: null, links: loose })
  return blocks
}

function linksOf(nodes: readonly DocsNavNode[]): DocsNavLink[] {
  const links: DocsNavLink[] = []
  for (const node of nodes) if (node.kind !== "group") links.push(node)
  return links
}
