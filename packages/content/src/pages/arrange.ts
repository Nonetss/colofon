import path from "node:path"
import { isCatalogPath } from "#contract/catalog/paths"
import type { Catalog } from "#contract/catalog/read"
import type { PageProblem } from "#contract/read/problems"
import type { NavEntry, NavNode } from "#pages/nav"
import type { Page, PageHeader } from "#pages/page"
import type { ContentSkill } from "#skills/read"

// Lays the read pages out as a site: the home, then the navigation's pages
// and sections in reading order (depth first, each section before its
// pages), each with its breadcrumbs and its previous and next page. Catalog
// pages are reference, not reading, and pages outside the navigation hang
// from the closest page above them.

/** A page as a link: previous and next page. */
export type PageLink = { path: string; title: string }

/** A step of a page's breadcrumbs; a group of the menu has no path. */
export type Breadcrumb = { path: string | null; title: string }

export type SitePage = Page & {
  /**
   * `file` for an `.mdx`; `folder` for a section without `index.mdx`;
   * `generated` for a catalog page.
   */
  source: "file" | "folder" | "generated"
  /** The groups and sections above the page, outermost first. */
  breadcrumbs: Breadcrumb[]
  previous: PageLink | null
  next: PageLink | null
  /** A section's pages and subsections; empty for a page. */
  children: NavNode[]
}

export type Site = {
  /** The home, then the top-level groups, sections and pages in order. */
  home: NavEntry
  nav: NavNode[]
  /** Every page and section by path (`""` is the home). */
  pages: ReadonlyMap<string, SitePage>
  /** Every page's problems, in reading order. */
  problems: PageProblem[]
  /** The cleaned stylesheet of `styles/` (`content-styles`); empty without. */
  styles: string
  /** The valid skills of `skills/`, by name; empty without. */
  skills: ContentSkill[]
  /** The valid catalog entities by type, as the catalog pages show them. */
  catalog: Catalog
}

export function homeEntry(
  read: ReadonlyMap<string, Page>,
  siteName: string
): NavEntry {
  const page = read.get("")
  if (page === undefined)
    return { path: "", title: siteName, description: "", icon: null }
  return {
    path: "",
    title: page.header.title,
    description: page.header.description,
    icon: page.header.icon,
  }
}

type Visit = { entry: NavEntry; breadcrumbs: Breadcrumb[]; children: NavNode[] }

export function arrange(
  home: NavEntry,
  nav: NavNode[],
  read: ReadonlyMap<string, Page>,
  siteProblems: readonly PageProblem[],
  { styles, skills, catalog }: Pick<Site, "styles" | "skills" | "catalog">
): Site {
  const visits: Visit[] = [{ entry: home, breadcrumbs: [], children: nav }]
  const walk = (nodes: NavNode[], breadcrumbs: Breadcrumb[]) => {
    for (const node of nodes) {
      if (node.kind === "group") {
        walk(node.children, [...breadcrumbs, { path: null, title: node.title }])
        continue
      }
      const entry = {
        path: node.path,
        title: node.title,
        description: node.description,
        icon: node.icon,
      }
      if (node.kind === "page") {
        visits.push({ entry, breadcrumbs, children: [] })
        continue
      }
      visits.push({ entry, breadcrumbs, children: node.children })
      walk(node.children, [
        ...breadcrumbs,
        { path: node.path, title: node.title },
      ])
    }
  }
  walk(nav, [])

  // Catalog pages are reference, not reading: no previous or next page.
  const reading = visits.filter((visit) => !isCatalogPath(visit.entry.path))
  const pages = new Map<string, SitePage>()
  const problems: PageProblem[] = []
  for (const visit of visits) {
    const page = read.get(visit.entry.path)
    const base = withSiteProblems(pageOrFolder(page, visit.entry), siteProblems)
    problems.push(...base.problems)
    const at = reading.indexOf(visit)
    pages.set(visit.entry.path, {
      ...base,
      source: sourceOf(page, visit.entry.path),
      breadcrumbs: visit.breadcrumbs,
      previous: linkAt(reading, at, -1),
      next: linkAt(reading, at, 1),
      children: visit.children,
    })
  }

  // Pages outside the navigation (an entity, the catalog when the menu only
  // shows some types) hang from the closest page above them.
  for (const [pagePath, page] of read) {
    if (pages.has(pagePath)) continue
    problems.push(...page.problems)
    pages.set(pagePath, {
      ...page,
      source: sourceOf(page, pagePath),
      breadcrumbs: breadcrumbsAbove(pagePath, pages),
      previous: null,
      next: null,
      children: [],
    })
  }
  return { home, nav, pages, problems, styles, skills, catalog }
}

/** The site's own problems (menu.yaml, reserved files, styles) go on the home. */
function withSiteProblems(
  page: Page,
  siteProblems: readonly PageProblem[]
): Page {
  if (page.path !== "" || siteProblems.length === 0) return page
  return { ...page, problems: [...siteProblems, ...page.problems] }
}

function breadcrumbsAbove(
  pagePath: string,
  pages: ReadonlyMap<string, SitePage>
): Breadcrumb[] {
  let parent = path.posix.dirname(pagePath)
  while (parent !== ".") {
    const above = pages.get(parent)
    if (above !== undefined)
      return [...above.breadcrumbs, { path: parent, title: above.header.title }]
    parent = path.posix.dirname(parent)
  }
  return []
}

function sourceOf(
  page: Page | undefined,
  pagePath: string
): SitePage["source"] {
  if (isCatalogPath(pagePath)) return "generated"
  if (page === undefined) return "folder"
  return "file"
}

function pageOrFolder(page: Page | undefined, entry: NavEntry): Page {
  if (page !== undefined) return page
  return {
    path: entry.path,
    header: folderHeader(entry),
    tree: null,
    headings: [],
    problems: [],
  }
}

function folderHeader(entry: NavEntry): PageHeader {
  return {
    title: entry.title,
    description: "",
    icon: entry.icon,
    order: null,
    updated: null,
    editado: null,
    fields: {},
  }
}

function linkAt(
  reading: readonly Visit[],
  at: number,
  step: number
): PageLink | null {
  if (at === -1) return null
  const visit = reading[at + step]
  if (visit === undefined) return null
  return { path: visit.entry.path, title: visit.entry.title }
}
