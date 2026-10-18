import { readFile as readBytes, realpath, stat } from "node:fs/promises"
import path from "node:path"
import {
  type Breadcrumb,
  createDocsSearch,
  DOCS_DIR,
  type EntityHit,
  entityPath,
  type FieldDefinition,
  fieldLabel,
  isImageFile,
  type NavEntry,
  type NavNode,
  type PageLink,
  type SearchHit,
  type Site,
  type SitePage,
  type SiteRoutes,
} from "@nonete/content"
import type { Element, ElementContent, Root } from "hast"
import type { z } from "zod"
import type { Context } from "#context"
import { errors } from "#errors"
import {
  audienceOfUser,
  type ContentReader,
  type RepositoryAudience,
  type RepositoryStore,
  readerRoutesOf,
  type StoredRepository,
} from "#v1/content/reader"
import type { docsInput } from "#v1/docs/input"
import type { DocsHastContent, DocsNavNode, docsOutput } from "#v1/docs/output"

// The documentation reader: what signed-in users read of the content
// repositories. The content reader owns the clones and the parsed pages; this
// only maps them to the reader's outputs, hides page problems from
// non-admins and serves the images under docs/.

/** Largest image the reader serves. */
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024

const CONTENT_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  svg: "image/svg+xml",
}

// An SVG opened on its own can run script on our origin: no script, no
// external loads, and a sandbox in case a browser ignores the rest.
const SVG_POLICY = "default-src 'none'; style-src 'unsafe-inline'; sandbox"

/** Catalog entities a search returns, whatever its limit. */
const SEARCH_ENTITY_LIMIT = 5

const PAGE_NOT_FOUND = "Ficha no encontrada"
const FILE_NOT_FOUND = "Fichero no encontrado"

type NavOutput = z.infer<typeof docsOutput.nav>
type PageOutput = z.infer<typeof docsOutput.page>
type SearchOutput = z.infer<typeof docsOutput.search>

type SearchResult = SearchOutput["results"][number]
type SearchEntity = SearchOutput["entities"][number]

export type DocsHandlerOptions = {
  reader: ContentReader
  repositories: RepositoryStore
}

export function createDocsHandler({
  reader,
  repositories,
}: DocsHandlerOptions) {
  // One index for every repository, so pages of several rank on the same
  // terms. A sync replaces a repository's `Site`, and the next search
  // re-indexes that repository alone.
  const docsSearch = createDocsSearch()

  async function readableSites(audience: RepositoryAudience) {
    const readable: { repository: StoredRepository; site: Site }[] = []
    for (const stored of await repositories.list(audience)) {
      const read = await reader.site(stored.slug, audience)
      if (read?.site !== undefined)
        readable.push({ repository: read.repository, site: read.site })
    }
    return readable
  }

  return {
    async nav({ context }: { context: Context }): Promise<NavOutput> {
      const audience = audienceOfUser(context.user)
      const stored = await repositories.list(audience)
      const answer: NavOutput["repositories"] = []
      for (const repository of stored) {
        answer.push(await navOf(reader, repository, audience))
      }
      return { repositories: answer }
    },

    async page({
      context,
      input,
    }: {
      context: Context
      input: z.infer<typeof docsInput.page>
    }): Promise<PageOutput> {
      const read = await reader.site(
        input.repository,
        audienceOfUser(context.user)
      )
      if (read === undefined || read.site === undefined)
        throw errors.NOT_FOUND({ message: PAGE_NOT_FOUND })
      const found = read.site.pages.get(input.path)
      if (found === undefined)
        throw errors.NOT_FOUND({ message: PAGE_NOT_FOUND })
      const routes = readerRoutesOf(read.repository.slug)
      const header = read.declarations?.config.header ?? {}
      return {
        repository: {
          slug: read.repository.slug,
          name: read.repository.name,
        },
        path: found.path,
        href: routes.routeOf(found.path),
        source: found.source,
        header: {
          title: found.header.title,
          description: found.header.description,
          icon: found.header.icon,
          updated: found.header.updated,
          edited: found.header.editado,
          fields: headerFields(found, header, read.site, routes),
        },
        tree: toWire(found.tree),
        headings: found.headings,
        breadcrumbs: found.breadcrumbs.map((crumb) =>
          breadcrumbOf(crumb, routes)
        ),
        previous: linkOrNull(found.previous, routes),
        next: linkOrNull(found.next, routes),
        children: found.children.map((node) => navNodeOf(node, routes)),
        hasProblems: found.problems.length > 0,
        problems: problemsFor(context, found),
        styles: stylesOf(read.site),
      }
    },

    async search({
      context,
      input,
    }: {
      context: Context
      input: z.infer<typeof docsInput.search>
    }): Promise<SearchOutput> {
      const readable = await readableSites(audienceOfUser(context.user))
      const scoped = readable.filter(
        ({ repository }) => repository.slug === input.repository
      )
      const searched = scoped.length > 0 ? scoped : readable
      const bySlug = new Map<string, StoredRepository>()
      for (const { repository, site } of searched) {
        docsSearch.update(repository.slug, site)
        bySlug.set(repository.slug, repository)
      }
      const answer = docsSearch.search(input.query, {
        repositories: new Set(bySlug.keys()),
        limit: input.limit,
        entityLimit: SEARCH_ENTITY_LIMIT,
      })
      const results: SearchResult[] = []
      for (const hit of answer.hits) {
        const repository = bySlug.get(hit.repository)
        if (repository !== undefined)
          results.push(searchResultOf(repository, hit))
      }
      const entities: SearchEntity[] = []
      for (const hit of answer.entities) {
        const repository = bySlug.get(hit.repository)
        if (repository !== undefined)
          entities.push(searchEntityOf(repository, hit))
      }
      return {
        allRepositories: searched.length > 1,
        partial: answer.partial,
        results,
        entities,
      }
    },

    async file({
      context,
      input,
    }: {
      context: Context
      input: z.infer<typeof docsInput.file>
    }): Promise<File> {
      const repository = await repositories.find(
        input.repository,
        audienceOfUser(context.user)
      )
      if (repository === undefined || !isImageFile(input.path))
        throw errors.NOT_FOUND({ message: FILE_NOT_FOUND })
      const root = await reader.contentRoot(repository)
      if (root === undefined)
        throw errors.NOT_FOUND({ message: FILE_NOT_FOUND })
      const target = await insideDocs(root, input.path)
      if (target === undefined)
        throw errors.NOT_FOUND({ message: FILE_NOT_FOUND })
      const extension = path.extname(target).slice(1).toLowerCase()
      const type = CONTENT_TYPES[extension] ?? "application/octet-stream"
      context.resHeaders?.set("X-Content-Type-Options", "nosniff")
      if (extension === "svg")
        context.resHeaders?.set("Content-Security-Policy", SVG_POLICY)
      const bytes = await readBytes(target)
      return new File([bytes], path.basename(target), { type })
    },
  }
}

async function navOf(
  reader: ContentReader,
  repository: StoredRepository,
  audience: RepositoryAudience
): Promise<NavOutput["repositories"][number]> {
  const read = await reader.site(repository.slug, audience)
  const base = { slug: repository.slug, name: repository.name }
  if (
    read === undefined ||
    read.site === undefined ||
    read.declarations === undefined
  ) {
    return {
      ...base,
      title: null,
      description: null,
      available: false,
      home: null,
      nodes: [],
    }
  }
  const routes = readerRoutesOf(repository.slug)
  return {
    ...base,
    title: read.declarations.config.name,
    description: descriptionOf(read.declarations.config.description),
    available: true,
    home: entryOf(read.site.home, routes),
    nodes: read.site.nav.map((node) => navNodeOf(node, routes)),
  }
}

function searchResultOf(
  repository: StoredRepository,
  hit: SearchHit
): SearchResult {
  const route = readerRoutesOf(repository.slug).routeOf(hit.path)
  return {
    repository: { slug: repository.slug, name: repository.name },
    path: hit.path,
    href: withAnchor(route, hit.anchor),
    title: hit.title,
    description: hit.description,
    trail: hit.trail,
    excerpt: hit.excerpt,
    sections: hit.sections.map((section) => ({
      heading: section.heading,
      href: withAnchor(route, section.anchor),
      excerpt: section.excerpt,
    })),
    terms: hit.terms,
    missing: hit.missing,
  }
}

function searchEntityOf(
  repository: StoredRepository,
  hit: EntityHit
): SearchEntity {
  return {
    repository: { slug: repository.slug, name: repository.name },
    type: hit.type,
    id: hit.id,
    label: hit.label,
    href: readerRoutesOf(repository.slug).routeOf(hit.path),
    exact: hit.exact,
  }
}

function withAnchor(route: string, anchor: string | null): string {
  if (anchor === null) return route
  return `${route}#${anchor}`
}

function descriptionOf(value: string | undefined): string | null {
  if (value === undefined) return null
  return value
}

function entryOf(entry: NavEntry, routes: SiteRoutes) {
  return {
    path: entry.path,
    href: routes.routeOf(entry.path),
    title: entry.title,
    description: entry.description,
    icon: entry.icon,
  }
}

function navNodeOf(node: NavNode, routes: SiteRoutes): DocsNavNode {
  if (node.kind === "page") return { kind: "page", ...entryOf(node, routes) }
  if (node.kind === "group")
    return {
      kind: "group",
      title: node.title,
      description: node.description,
      icon: node.icon,
      children: node.children.map((child) => navNodeOf(child, routes)),
    }
  return {
    kind: "section",
    ...entryOf(node, routes),
    children: node.children.map((child) => navNodeOf(child, routes)),
  }
}

function breadcrumbOf(crumb: Breadcrumb, routes: SiteRoutes) {
  if (crumb.path === null) return { ...crumb, href: null }
  return { ...crumb, href: routes.routeOf(crumb.path) }
}

function withHref(link: PageLink, routes: SiteRoutes) {
  return { ...link, href: routes.routeOf(link.path) }
}

function linkOrNull(link: PageLink | null, routes: SiteRoutes) {
  if (link === null) return null
  return withHref(link, routes)
}

/** The repository's stylesheet, `null` when its `styles/` gives none. */
function stylesOf(site: Site): string | null {
  if (site.styles === "") return null
  return site.styles
}

function problemsFor(context: Context, found: SitePage) {
  if (context.user?.role !== "admin") return []
  return found.problems
}

/** The site's header fields that the page sets, as text and links. */
function headerFields(
  found: SitePage,
  header: Record<string, FieldDefinition>,
  site: Site,
  routes: SiteRoutes
) {
  const fields: PageOutput["header"]["fields"] = []
  for (const [name, field] of Object.entries(header)) {
    if (!(name in found.header.fields)) continue
    const values = valuesOf(found.header.fields[name], field, site, routes)
    if (values.length > 0)
      fields.push({ name, label: fieldLabel(name, field), values })
  }
  return fields
}

type HeaderValue = { text: string; href: string | null }

function valuesOf(
  value: unknown,
  field: FieldDefinition,
  site: Site,
  routes: SiteRoutes
): HeaderValue[] {
  if (field.type === "list" && Array.isArray(value)) {
    return value.flatMap((item) => valuesOf(item, field.of, site, routes))
  }
  if (field.type === "page" && typeof value === "string") {
    return [{ text: pageTitle(site, value), href: routes.routeOf(value) }]
  }
  if (field.type === "ref" && typeof value === "string") {
    const entityPage = entityPath(field.to, value)
    if (!site.pages.has(entityPage)) return [{ text: value, href: null }]
    return [
      { text: pageTitle(site, entityPage), href: routes.routeOf(entityPage) },
    ]
  }
  if (typeof value === "object" && value !== null) {
    return [{ text: JSON.stringify(value), href: null }]
  }
  return [{ text: String(value), href: null }]
}

function pageTitle(site: Site, pagePath: string): string {
  const found = site.pages.get(pagePath)
  if (found === undefined) return pagePath
  return found.header.title
}

/** The page tree as the output schema carries it: elements and text only. */
function toWire(tree: Root | null): PageOutput["tree"] {
  if (tree === null) return null
  return { type: "root", children: contentOf(tree.children) }
}

function contentOf(
  nodes: readonly (Root["children"][number] | ElementContent)[]
): DocsHastContent[] {
  const wire: DocsHastContent[] = []
  for (const node of nodes) {
    if (node.type === "text") wire.push({ type: "text", value: node.value })
    if (node.type === "element") wire.push(elementOf(node))
  }
  return wire
}

function elementOf(node: Element): DocsHastContent {
  const properties: Record<
    string,
    string | number | boolean | null | (string | number)[]
  > = {}
  for (const [key, value] of Object.entries(node.properties)) {
    if (value !== undefined) properties[key] = value
  }
  return {
    type: "element",
    tagName: node.tagName,
    properties,
    children: contentOf(node.children),
  }
}

/**
 * The real path of `relative` under the content root's docs/, or `undefined` when
 * it doesn't exist, isn't a file, is too large or resolves outside docs/
 * (through `..` or a symlink).
 */
async function insideDocs(
  contentRoot: string,
  relative: string
): Promise<string | undefined> {
  try {
    const root = await realpath(path.join(contentRoot, DOCS_DIR))
    const target = await realpath(path.join(root, relative))
    if (!target.startsWith(`${root}${path.sep}`)) return undefined
    const info = await stat(target)
    if (!info.isFile() || info.size > MAX_IMAGE_BYTES) return undefined
    return target
  } catch {
    return undefined
  }
}
