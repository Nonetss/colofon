import type { Dirent } from "node:fs"
import { readdir, readFile } from "node:fs/promises"
import path from "node:path"
import type { Catalog } from "#catalog"
import type { CatalogIndex } from "#entity-schema"
import type { SiteConfig } from "#meta-schema"
import { type HeaderSchema, headerSchema, readHeader } from "#pages/header"
import { type ParsedPage, parsePage } from "#pages/parse"
import { pageToHast } from "#pages/to-hast"
import { pagePathOf, transformPage } from "#pages/transform"
import type { Page, PageHeader, PageProblem } from "#pages/types"

// Reads every page of a repository's docs/ and arranges them: the home
// (docs/index.mdx), one section per folder holding pages, and each page in
// its folder's section, ordered by `orden` and then by title. The reading
// order (home, then each section's index before its pages and subsections,
// depth first) gives every page its previous and next page. Pages are read
// in two passes: every header first, so a page can show another page's
// title (a `ficha` cell of `<Entities>`), then every body.

const DOCS_DIR = "docs"

/** A page or section as the navigation lists it. */
export type NavEntry = {
  path: string
  title: string
  description: string
  icon: string | null
}

export type NavNode =
  | ({ kind: "page" } & NavEntry)
  | ({ kind: "section"; children: NavNode[] } & NavEntry)

/** A page as a link: previous/next and breadcrumbs. */
export type PageLink = { path: string; title: string }

export type SitePage = Page & {
  /** `file` for an `.mdx`; `folder` for a section without `index.mdx`. */
  source: "file" | "folder"
  /** The sections above the page, outermost first. */
  breadcrumbs: PageLink[]
  previous: PageLink | null
  next: PageLink | null
  /** A section's pages and subsections; empty for a page. */
  children: NavNode[]
}

export type Site = {
  /** The home, then the top-level sections and pages in order. */
  home: NavEntry
  nav: NavNode[]
  /** Every page and section by path (`""` is the home). */
  pages: ReadonlyMap<string, SitePage>
  /** Every page's problems, in reading order. */
  problems: PageProblem[]
}

export type SiteRoutes = {
  /** The reader route of a page path. */
  routeOf: (pagePath: string) => string
  /** The URL of a file under `docs/`. */
  fileUrlOf: (docsPath: string) => string
}

/** Reads the pages of the repository at `root`. */
export async function readSite(
  root: string,
  config: SiteConfig,
  index: CatalogIndex,
  catalog: Catalog,
  routes: SiteRoutes
): Promise<Site> {
  const docsRoot = path.join(root, DOCS_DIR)
  const files = await listFiles(docsRoot)
  const fileSet = new Set(files)
  const mdxFiles = files.filter((file) => file.endsWith(".mdx"))
  const pagePaths = new Set(mdxFiles.map(pagePathOf))
  for (const folder of foldersWithPages(mdxFiles)) pagePaths.add(folder)
  pagePaths.add("")

  const schema = headerSchema(config, index)
  const headed: HeadedPage[] = []
  for (const file of mdxFiles) {
    const source = await readFile(path.join(docsRoot, file), "utf8")
    headed.push(headPage(source, file, schema))
  }
  const titles = new Map(headed.map((page) => [page.path, page.header.titulo]))
  const context: BuildContext = {
    pages: pagePaths,
    files: fileSet,
    catalog,
    routes,
    titleOf: (pagePath) => titleOr(titles.get(pagePath), pagePath),
  }
  const read = new Map<string, Page>()
  for (const page of headed) read.set(page.path, buildPage(page, context))

  const tree = buildTree("", read, mdxFiles)
  const home = entryOf("", read, config.nombre)
  return arrange(home, tree, read)
}

/** A page with its header read and its body parsed, not yet transformed. */
type HeadedPage = {
  path: string
  file: string
  contentFile: string
  parsed: ParsedPage
  header: PageHeader
  problems: PageProblem[]
}

type BuildContext = {
  pages: ReadonlySet<string>
  files: ReadonlySet<string>
  catalog: Catalog
  routes: SiteRoutes
  titleOf: (pagePath: string) => string
}

function titleOr(title: string | undefined, pagePath: string): string {
  if (title === undefined) return fallbackTitleOf(pagePath)
  return title
}

function headPage(
  source: string,
  file: string,
  schema: HeaderSchema
): HeadedPage {
  const pagePath = pagePathOf(file)
  const contentFile = `${DOCS_DIR}/${file}`
  const parsed = parsePage(source)
  const { header, problems } = readHeader(
    parsed.header,
    schema,
    contentFile,
    fallbackTitleOf(pagePath)
  )
  return { path: pagePath, file, contentFile, parsed, header, problems }
}

function buildPage(page: HeadedPage, context: BuildContext): Page {
  const { path: pagePath, file, contentFile, parsed, header } = page
  const problems = [...page.problems]
  if (!parsed.ok) {
    problems.push({
      file: contentFile,
      line: parsed.line,
      message: `La ficha no se puede leer: ${parsed.message}`,
    })
    return { path: pagePath, header, tree: null, headings: [], problems }
  }
  const transformed = transformPage(parsed.tree, {
    file: contentFile,
    folder: folderOf(file),
    pages: context.pages,
    files: context.files,
    catalog: context.catalog,
    routeOf: context.routes.routeOf,
    fileUrlOf: context.routes.fileUrlOf,
    titleOf: context.titleOf,
  })
  problems.push(...transformed.problems)
  problems.sort(byLine)
  return {
    path: pagePath,
    header,
    tree: pageToHast(parsed.tree),
    headings: transformed.headings,
    problems,
  }
}

/** The folder of a file under `docs/`, `""` at the top. */
function folderOf(file: string): string {
  const folder = path.posix.dirname(file)
  if (folder === ".") return ""
  return folder
}

function byLine(a: PageProblem, b: PageProblem): number {
  return lineValue(a) - lineValue(b)
}

function lineValue(problem: PageProblem): number {
  if (problem.line === null) return 0
  return problem.line
}

function fallbackTitleOf(pagePath: string): string {
  const name = path.posix.basename(pagePath)
  if (name === "") return "Inicio"
  return name
}

/** Every folder that holds a page at any depth (`red`, `red/vpn`). */
function foldersWithPages(mdxFiles: readonly string[]): Set<string> {
  const folders = new Set<string>()
  for (const file of mdxFiles) {
    let folder = path.posix.dirname(file)
    while (folder !== ".") {
      folders.add(folder)
      folder = path.posix.dirname(folder)
    }
  }
  return folders
}

function entryOf(
  pagePath: string,
  read: ReadonlyMap<string, Page>,
  fallbackTitle: string
): NavEntry {
  const page = read.get(pagePath)
  if (page === undefined)
    return { path: pagePath, title: fallbackTitle, description: "", icon: null }
  return {
    path: pagePath,
    title: page.header.titulo,
    description: page.header.descripcion,
    icon: page.header.icono,
  }
}

/** The sections and pages directly in `folder`, ordered. */
function buildTree(
  folder: string,
  read: ReadonlyMap<string, Page>,
  mdxFiles: readonly string[]
): NavNode[] {
  const nodes: { node: NavNode; order: number | null }[] = []
  const subfolders = new Set<string>()
  for (const file of mdxFiles) {
    const relative = relativeTo(folder, file)
    if (relative === undefined) continue
    const [first = "", ...rest] = relative.split("/")
    if (rest.length > 0) {
      subfolders.add(first)
      continue
    }
    if (first === "index.mdx") continue
    const pagePath = pagePathOf(file)
    nodes.push({
      node: { kind: "page", ...entryOf(pagePath, read, pagePath) },
      order: orderOf(read.get(pagePath)),
    })
  }
  for (const name of subfolders) {
    const sectionPath = joinPath(folder, name)
    nodes.push({
      node: {
        kind: "section",
        ...entryOf(sectionPath, read, name),
        children: buildTree(sectionPath, read, mdxFiles),
      },
      order: orderOf(read.get(sectionPath)),
    })
  }
  return nodes.sort(byOrderThenTitle).map((entry) => entry.node)
}

function relativeTo(folder: string, file: string): string | undefined {
  if (folder === "") return file
  if (!file.startsWith(`${folder}/`)) return undefined
  return file.slice(folder.length + 1)
}

function joinPath(folder: string, name: string): string {
  if (folder === "") return name
  return `${folder}/${name}`
}

function orderOf(page: Page | undefined): number | null {
  if (page === undefined) return null
  return page.header.orden
}

const collator = new Intl.Collator("es", { numeric: true })

function byOrderThenTitle(
  a: { node: NavNode; order: number | null },
  b: { node: NavNode; order: number | null }
): number {
  if (a.order !== b.order) {
    if (a.order === null) return 1
    if (b.order === null) return -1
    return a.order - b.order
  }
  return collator.compare(a.node.title, b.node.title)
}

type Visit = { entry: NavEntry; breadcrumbs: PageLink[]; children: NavNode[] }

function arrange(
  home: NavEntry,
  nav: NavNode[],
  read: ReadonlyMap<string, Page>
): Site {
  const order: Visit[] = [{ entry: home, breadcrumbs: [], children: nav }]
  const walk = (nodes: NavNode[], breadcrumbs: PageLink[]) => {
    for (const node of nodes) {
      const entry = {
        path: node.path,
        title: node.title,
        description: node.description,
        icon: node.icon,
      }
      if (node.kind === "page") {
        order.push({ entry, breadcrumbs, children: [] })
        continue
      }
      order.push({ entry, breadcrumbs, children: node.children })
      walk(node.children, [
        ...breadcrumbs,
        { path: node.path, title: node.title },
      ])
    }
  }
  walk(nav, [])

  const pages = new Map<string, SitePage>()
  const problems: PageProblem[] = []
  order.forEach((visit, at) => {
    const page = read.get(visit.entry.path)
    const base = pageOrFolder(page, visit.entry)
    problems.push(...base.problems)
    pages.set(visit.entry.path, {
      ...base,
      source: sourceOf(page),
      breadcrumbs: visit.breadcrumbs,
      previous: linkAt(order, at - 1),
      next: linkAt(order, at + 1),
      children: visit.children,
    })
  })
  return { home, nav, pages, problems }
}

function sourceOf(page: Page | undefined): SitePage["source"] {
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
    titulo: entry.title,
    descripcion: "",
    icono: null,
    orden: null,
    actualizado: null,
    campos: {},
  }
}

function linkAt(order: readonly Visit[], at: number): PageLink | null {
  const visit = order[at]
  if (visit === undefined) return null
  return { path: visit.entry.path, title: visit.entry.title }
}

/** Every regular file under `dir`, relative to it, skipping hidden entries. */
async function listFiles(dir: string, prefix = ""): Promise<string[]> {
  const entries = await listDir(dir)
  const files: string[] = []
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue
    const relative = joinPath(prefix, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await listFiles(path.join(dir, entry.name), relative)))
      continue
    }
    if (entry.isFile()) files.push(relative)
  }
  return files
}

async function listDir(dir: string): Promise<Dirent[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true })
    return entries.sort((a, b) => a.name.localeCompare(b.name))
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT")
      return []
    throw error
  }
}
