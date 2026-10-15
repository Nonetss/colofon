import type { AppRouterClient } from "@nonete/api/router"

/** The reader's navigation, as `v1.docs.nav` answers it. */
export type DocsNav = Awaited<ReturnType<AppRouterClient["v1"]["docs"]["nav"]>>

export type DocsRepository = DocsNav["repositories"][number]

export type DocsNavNode = DocsRepository["nodes"][number]

/** A page as the navbar search lists it. */
export type DocsPageEntry = {
  href: string
  label: string
  description: string
  /** The repository (in "Todos") and the sections above the page. */
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
 * sidebar can open them.
 */
export function sectionsAbove(
  nodes: readonly DocsNavNode[],
  pathname: string
): string[] {
  for (const node of nodes) {
    if (node.kind !== "section") continue
    if (node.href === pathname) return [node.href]
    if (holds(node.children, pathname))
      return [node.href, ...sectionsAbove(node.children, pathname)]
  }
  return []
}

function holds(nodes: readonly DocsNavNode[], pathname: string): boolean {
  return nodes.some((node) => {
    if (node.href === pathname) return true
    if (node.kind !== "section") return false
    return holds(node.children, pathname)
  })
}

/** How many pages `node` holds: itself and every page under it. */
function pagesIn(node: DocsNavNode): number {
  if (node.kind === "page") return 1
  return node.children.reduce((total, child) => total + pagesIn(child), 1)
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
