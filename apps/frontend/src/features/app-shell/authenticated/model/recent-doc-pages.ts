import type { DocsNav, DocsNavNode } from "@/features/docs/shared"
import { appSurfaceList, isSurfacePathActive } from "@/lib/app-surfaces"
import { pageHrefOf } from "@/lib/site-nav"

/** The recent list the navbar keeps of documentation pages. */
export const RECENT_DOC_PAGES = "doc-pages"

/** A remembered page as the navigation the user reads now shows it. */
export interface RecentDocPage {
  href: string
  label: string
  /** The repository, then the groups and sections above the page. */
  trail: string[]
}

/** The application screens: every concrete route but the home. */
const APP_PATHS = appSurfaceList
  .map((surface) => surface.path)
  .filter((path) => path !== "/" && !path.includes("["))

/**
 * `pathname` as the navigation writes routes (decoded, no trailing slash)
 * when it is a documentation page worth remembering: a route of the reader
 * (no application screen) that isn't an entity's catalog page
 * (`/<repo>/catalog/<type>/<id>`), which the navigation doesn't list;
 * `null` otherwise.
 */
export function recordableDocPath(pathname: string): string | null {
  const path = decodedPath(pathname).replace(/\/+$/, "")
  if (path === "") return null
  if (APP_PATHS.some((appPath) => isSurfacePathActive(appPath, path)))
    return null
  const segments = path.split("/").slice(1)
  if (segments.length === 4 && segments[1] === "catalog") return null
  return path
}

function decodedPath(pathname: string): string {
  try {
    return decodeURIComponent(pathname)
  } catch {
    return pathname
  }
}

/**
 * The remembered pages that the navigation still lists, in their order,
 * leaving out the current page; the rest (removed pages, repositories the
 * user no longer reads) are dropped.
 */
export function resolveRecentDocPages(
  hrefs: readonly string[],
  repositories: DocsNav["repositories"],
  currentPath: string
): RecentDocPage[] {
  const current = decodedPath(pageHrefOf(currentPath)).replace(/\/+$/, "")
  const pages: RecentDocPage[] = []
  for (const href of hrefs) {
    if (href === current) continue
    const found = findDocPage(href, repositories)
    if (found !== null) pages.push(found)
  }
  return pages
}

function findDocPage(
  href: string,
  repositories: DocsNav["repositories"]
): RecentDocPage | null {
  for (const repository of repositories) {
    if (!repository.available) continue
    if (repository.home?.href === href)
      return { href, label: repository.home.title, trail: [repository.name] }
    const trail = trailTo(href, repository.nodes, [])
    if (trail !== null)
      return {
        href,
        label: trail.label,
        trail: [repository.name, ...trail.above],
      }
  }
  return null
}

/** The title of the node at `href` and the titles above it, or `null`. */
function trailTo(
  href: string,
  nodes: readonly DocsNavNode[],
  above: string[]
): { label: string; above: string[] } | null {
  for (const node of nodes) {
    if (node.kind !== "group" && node.href === href)
      return { label: node.title, above }
    if (node.kind === "page") continue
    const found = trailTo(href, node.children, [...above, node.title])
    if (found !== null) return found
  }
  return null
}
