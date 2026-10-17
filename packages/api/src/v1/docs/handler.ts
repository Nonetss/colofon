import { readFile as readBytes, realpath, stat } from "node:fs/promises"
import path from "node:path"
import {
  type Breadcrumb,
  compareHits,
  createSiteSearch,
  DOCS_DIR,
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
  type SiteSearch,
  searchSite,
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

const PAGE_NOT_FOUND = "Ficha no encontrada"
const FILE_NOT_FOUND = "Fichero no encontrado"

type NavOutput = z.infer<typeof docsOutput.nav>
type PageOutput = z.infer<typeof docsOutput.page>
type SearchOutput = z.infer<typeof docsOutput.search>

type RepositoryHit = { repository: StoredRepository; hit: SearchHit }

export type DocsHandlerOptions = {
  reader: ContentReader
  repositories: RepositoryStore
}

export function createDocsHandler({
  reader,
  repositories,
}: DocsHandlerOptions) {
  // One index per read of a repository's pages: a sync replaces the `Site`,
  // so its index is built again on the next search and the old one is freed.
  const searches = new WeakMap<Site, SiteSearch>()

  function searchOf(site: Site): SiteSearch {
    const cached = searches.get(site)
    if (cached !== undefined) return cached
    const built = createSiteSearch(site)
    searches.set(site, built)
    return built
  }

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
      const cabecera = read.declarations?.config.cabecera ?? {}
      return {
        repository: {
          slug: read.repository.slug,
          name: read.repository.name,
        },
        path: found.path,
        href: routes.routeOf(found.path),
        source: found.source,
        header: {
          title: found.header.titulo,
          description: found.header.descripcion,
          icon: found.header.icono,
          updated: found.header.actualizado,
          edited: found.header.editado,
          fields: headerFields(found, cabecera, read.site, routes),
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
      const hits: RepositoryHit[] = []
      for (const { repository, site } of searched) {
        for (const hit of searchSite(searchOf(site), input.query, input.limit))
          hits.push({ repository, hit })
      }
      hits.sort((a, b) => compareHits(a.hit, b.hit))
      return {
        allRepositories: searched.length > 1,
        results: hits.slice(0, input.limit).map(searchResultOf),
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
    title: read.declarations.config.nombre,
    description: descriptionOf(read.declarations.config.descripcion),
    available: true,
    home: entryOf(read.site.home, routes),
    nodes: read.site.nav.map((node) => navNodeOf(node, routes)),
  }
}

function searchResultOf({
  repository,
  hit,
}: RepositoryHit): SearchOutput["results"][number] {
  const route = readerRoutesOf(repository.slug).routeOf(hit.path)
  return {
    repository: { slug: repository.slug, name: repository.name },
    path: hit.path,
    href: withAnchor(route, hit.anchor),
    title: hit.title,
    description: hit.description,
    trail: hit.trail,
    excerpt: hit.excerpt,
    terms: hit.terms,
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
  cabecera: Record<string, FieldDefinition>,
  site: Site,
  routes: SiteRoutes
) {
  const fields: PageOutput["header"]["fields"] = []
  for (const [name, field] of Object.entries(cabecera)) {
    if (!(name in found.header.campos)) continue
    const values = valuesOf(found.header.campos[name], field, site, routes)
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
  if (field.tipo === "lista" && Array.isArray(value)) {
    return value.flatMap((item) => valuesOf(item, field.de, site, routes))
  }
  if (field.tipo === "ficha" && typeof value === "string") {
    return [{ text: pageTitle(site, value), href: routes.routeOf(value) }]
  }
  if (field.tipo === "ref" && typeof value === "string") {
    const entityPage = entityPath(field.a, value)
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
  return found.header.titulo
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
