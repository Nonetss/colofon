import type { Dirent } from "node:fs"
import { readdir, readFile } from "node:fs/promises"
import path from "node:path"
import type { Element } from "hast"
import type { Catalog } from "#contract/catalog"
import { entityPath, isCatalogPath } from "#contract/catalog-paths"
import type { CatalogIndex } from "#contract/entity-schema"
import { DOCS_DIR, isReservedDocsPath } from "#contract/load"
import type { Menu, SiteConfig } from "#contract/meta-schema"
import type { PageProblem } from "#contract/problems"
import { type ContentSkill, readSkills } from "#contract/skills"
import { diagramFigure } from "#diagrams/figure"
import type { DiagramFile } from "#diagrams/model"
import { diagramsByEntity, readDiagrams } from "#diagrams/read"
import {
  type CatalogBodyContext,
  catalogPages,
  withCatalogBody,
} from "#pages/catalog-pages"
import { formerNameProblems } from "#pages/former-names"
import { type HeaderSchema, headerSchema, readHeader } from "#pages/header"
import {
  folderNav,
  joinPath,
  type MenuOverride,
  type MenuTargets,
  menuNav,
  type NavEntry,
  type NavNode,
  type NavSource,
  OTHERS_TITLE,
  type ResolvedMenu,
  resolveMenu,
} from "#pages/nav"
import { type ParsedPage, parsePage } from "#pages/parse"
import { refsIn, reverseRefs } from "#pages/references"
import { pageToHast } from "#pages/to-hast"
import { pagePathOf, transformPage } from "#pages/transform"
import type { Page, PageHeader } from "#pages/types"
import { readStyles } from "#styles/read"

// Reads every page of a repository's docs/, adds the generated catalog pages
// and arranges them: the home (docs/index.mdx), then the navigation (the
// groups of menu.yaml, or the folders and the catalog without one). The
// reading order (depth first, each section's index before its pages) gives
// every page its previous and next page; catalog pages are left out of it.
// Pages are read in two passes: every header first, with what menu.yaml says
// about it applied (the YAML wins), so a page can show another page's title,
// then every body. The repository's style modules (`styles/`) are read with
// them, so their stylesheet follows the same checkout, and so are its skills
// (`skills/`), whose problems go on the home with the site's own.

export type { NavEntry, NavNode } from "#pages/nav"

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

export type SiteRoutes = {
  /** The reader route of a page path. */
  routeOf: (pagePath: string) => string
  /** The URL of a file under `docs/`. */
  fileUrlOf: (docsPath: string) => string
}

/**
 * Reads the pages of the repository at `root`. `editDates` holds the last
 * commit date of each file, by its path under `root` (`readEditDates`).
 */
export async function readSite(
  root: string,
  config: SiteConfig,
  index: CatalogIndex,
  catalog: Catalog,
  routes: SiteRoutes,
  menu: Menu | null,
  editDates: ReadonlyMap<string, string>
): Promise<Site> {
  const docsRoot = path.join(root, DOCS_DIR)
  const files = await listFiles(docsRoot)
  const fileSet = new Set(files)
  const siteProblems: PageProblem[] = []
  const mdxFiles: string[] = []
  for (const file of files) {
    if (!file.endsWith(".mdx")) continue
    if (isReservedDocsPath(file)) {
      siteProblems.push(reservedProblem(file))
      continue
    }
    mdxFiles.push(file)
  }
  siteProblems.push(...(await formerNameProblems(root)))
  const pagePaths = new Set(mdxFiles.map(pagePathOf))
  const folders = foldersWithPages(mdxFiles)
  for (const folder of folders) pagePaths.add(folder)
  pagePaths.add("")

  const typeIds = [...catalog.keys()]
  const resolved = resolveMenuOf(menu, {
    pages: pagePaths,
    folders,
    types: typeIds,
  })
  siteProblems.push(...resolved.problems)

  const diagramRead = await readDiagrams(root, {
    catalog,
    pages: pagePaths,
  })
  siteProblems.push(...diagramRead.problems)

  const styles = await readStyles(root, fileSet, routes.fileUrlOf)
  siteProblems.push(...styles.problems)
  const skills = await readSkills(root)
  siteProblems.push(...skills.problems)
  const { diagrams } = diagramRead

  const schema = headerSchema(config, index)
  const headed: HeadedPage[] = []
  for (const file of mdxFiles) {
    const source = await readFile(path.join(docsRoot, file), "utf8")
    headed.push(
      withOverride(headPage(source, file, schema, editDates), resolved)
    )
  }
  const generated = catalogPages(catalog, editDates)
  for (const [pagePath, page] of generated)
    generated.set(pagePath, overridden(page, resolved.overrides))

  const titles = new Map(headed.map((page) => [page.path, page.header.titulo]))
  const context: BuildContext = {
    pages: pagePaths,
    files: fileSet,
    catalog,
    routes,
    titleOf: (pagePath) => titleOr(titles.get(pagePath), pagePath),
    diagrams,
  }
  const read = new Map<string, Page>()
  const cited = new Map<string, string[]>()
  for (const page of headed) {
    const built = buildPage(page, context)
    read.set(page.path, built.page)
    const headerRefs = refsIn(page.header.campos, config.cabecera ?? {}).map(
      (ref) => entityPath(ref.type, ref.id)
    )
    cited.set(page.path, [...new Set([...headerRefs, ...built.cited])])
  }
  for (const [pagePath, page] of generated) read.set(pagePath, page)

  const source = {
    read,
    mdxFiles,
    typeIds,
    overrides: resolved.overrides,
  }
  const home = homeEntry(read, config.nombre)
  const nav = navOf(menu, resolved, source)

  const bodyContext: CatalogBodyContext = {
    catalog,
    routeOf: routes.routeOf,
    titleOf: context.titleOf,
    citations: citationsByEntity(readingPaths(nav), cited),
    reverse: reverseRefs(catalog),
    diagramsOf: diagramFiguresOf(diagrams, routes.routeOf),
  }
  for (const [pagePath] of generated) {
    const page = read.get(pagePath)
    if (page !== undefined)
      read.set(pagePath, withCatalogBody(page, bodyContext))
  }
  return arrange(home, nav, read, siteProblems, {
    styles: styles.css,
    skills: skills.skills,
    catalog,
  })
}

/**
 * The navigation: the menu's groups (each page it leaves out reported), or
 * the folders and the catalog without a menu.
 */
function navOf(
  menu: Menu | null,
  resolved: ResolvedMenu,
  source: NavSource & { read: Map<string, Page> }
): NavNode[] {
  if (menu === null) return folderNav(source)
  const { nav, leftOut } = menuNav(resolved, source)
  for (const left of leftOut) {
    const page = source.read.get(left.path)
    if (page !== undefined)
      source.read.set(left.path, withLeftOutProblem(page, left.file))
  }
  return nav
}

/** The rendered diagrams each entity is a node of, by its page path. */
function diagramFiguresOf(
  diagrams: ReadonlyMap<string, DiagramFile>,
  routeOf: (pagePath: string) => string
): (entityPagePath: string) => Element[] {
  const byEntity = diagramsByEntity(diagrams)
  return (entityPagePath) => {
    const figures: Element[] = []
    for (const id of byEntity.get(entityPagePath) ?? []) {
      const diagram = diagrams.get(id)?.diagram
      if (diagram !== undefined && diagram !== null)
        figures.push(diagramFigure(diagram, routeOf))
    }
    return figures
  }
}

/** The page paths of the navigation, depth first, the home first. */
function readingPaths(nav: readonly NavNode[]): string[] {
  const paths = [""]
  const walk = (nodes: readonly NavNode[]) => {
    for (const node of nodes) {
      if (node.kind !== "group") paths.push(node.path)
      if (node.kind !== "page") walk(node.children)
    }
  }
  walk(nav)
  return paths
}

/** For each entity's page path, the pages citing it, in reading order. */
function citationsByEntity(
  order: readonly string[],
  cited: ReadonlyMap<string, readonly string[]>
): Map<string, string[]> {
  const citations = new Map<string, string[]>()
  const seen = new Set<string>()
  const add = (pagePath: string) => {
    if (seen.has(pagePath)) return
    seen.add(pagePath)
    for (const entity of cited.get(pagePath) ?? []) {
      const list = citations.get(entity)
      if (list === undefined) citations.set(entity, [pagePath])
      else list.push(pagePath)
    }
  }
  for (const pagePath of order) add(pagePath)
  for (const pagePath of cited.keys()) add(pagePath)
  return citations
}

function resolveMenuOf(menu: Menu | null, targets: MenuTargets): ResolvedMenu {
  if (menu === null) return { groups: [], overrides: new Map(), problems: [] }
  const pages = new Set(targets.pages)
  pages.delete("")
  return resolveMenu(menu, { ...targets, pages })
}

function reservedProblem(file: string): PageProblem {
  return {
    file: `${DOCS_DIR}/${file}`,
    line: null,
    message:
      "docs/catalog/ está reservada para las páginas que la plataforma hace del catálogo: esta ficha no se publica",
  }
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
  diagrams: ReadonlyMap<string, DiagramFile>
}

function titleOr(title: string | undefined, pagePath: string): string {
  if (title === undefined) return fallbackTitleOf(pagePath)
  return title
}

function headPage(
  source: string,
  file: string,
  schema: HeaderSchema,
  editDates: ReadonlyMap<string, string>
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
  const editado = editDates.get(contentFile) ?? null
  return {
    path: pagePath,
    file,
    contentFile,
    parsed,
    header: { ...header, editado },
    problems,
  }
}

/**
 * A page with the title and icon its menu entry gives (the YAML wins), and a
 * problem for each header value the menu overrides with another one.
 */
function withOverride(page: HeadedPage, menu: ResolvedMenu): HeadedPage {
  const override = menu.overrides.get(page.path)
  if (override === undefined) return page
  const problems = [...page.problems]
  const report = (message: string) =>
    problems.push({ file: page.contentFile, line: null, message })
  const { header } = page
  if (
    override.title !== null &&
    header.titulo !== override.title &&
    header.titulo !== fallbackTitleOf(page.path)
  )
    report(
      `titulo: la cabecera dice «${header.titulo}», pero manda menu.yaml («${override.title}»)`
    )
  if (
    override.icon !== null &&
    header.icono !== null &&
    header.icono !== override.icon
  )
    report(
      `icono: la cabecera dice \`${header.icono}\`, pero manda menu.yaml (\`${override.icon}\`)`
    )
  return { ...page, header: applyOverride(header, override), problems }
}

function overridden(
  page: Page,
  overrides: ReadonlyMap<string, MenuOverride>
): Page {
  const override = overrides.get(page.path)
  if (override === undefined) return page
  return { ...page, header: applyOverride(page.header, override) }
}

function applyOverride(header: PageHeader, override: MenuOverride): PageHeader {
  return {
    ...header,
    titulo: overriddenTitle(header, override),
    icono: overriddenIcon(header, override),
  }
}

function overriddenTitle(header: PageHeader, override: MenuOverride): string {
  if (override.title === null) return header.titulo
  return override.title
}

function overriddenIcon(
  header: PageHeader,
  override: MenuOverride
): string | null {
  if (override.icon === null) return header.icono
  return override.icon
}

function withLeftOutProblem(page: Page, file: string): Page {
  return {
    ...page,
    problems: [
      ...page.problems,
      {
        file,
        line: null,
        message: `Esta página no está en menu.yaml: sale en «${OTHERS_TITLE}»`,
      },
    ],
  }
}

/** A page with its body transformed, and the entities its links cite. */
type BuiltPage = { page: Page; cited: string[] }

function buildPage(page: HeadedPage, context: BuildContext): BuiltPage {
  const { path: pagePath, file, contentFile, parsed, header } = page
  const problems = [...page.problems]
  if (!parsed.ok) {
    problems.push({
      file: contentFile,
      line: parsed.line,
      message: `La ficha no se puede leer: ${parsed.message}`,
    })
    return {
      page: { path: pagePath, header, tree: null, headings: [], problems },
      cited: [],
    }
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
    diagrams: context.diagrams,
  })
  problems.push(...transformed.problems)
  problems.sort(byLine)
  return {
    page: {
      path: pagePath,
      header,
      tree: pageToHast(parsed.tree),
      headings: transformed.headings,
      problems,
    },
    cited: transformed.citations,
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

function homeEntry(
  read: ReadonlyMap<string, Page>,
  siteName: string
): NavEntry {
  const page = read.get("")
  if (page === undefined)
    return { path: "", title: siteName, description: "", icon: null }
  return {
    path: "",
    title: page.header.titulo,
    description: page.header.descripcion,
    icon: page.header.icono,
  }
}

type Visit = { entry: NavEntry; breadcrumbs: Breadcrumb[]; children: NavNode[] }

function arrange(
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
      return [
        ...above.breadcrumbs,
        { path: parent, title: above.header.titulo },
      ]
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
    titulo: entry.title,
    descripcion: "",
    icono: entry.icon,
    orden: null,
    actualizado: null,
    editado: null,
    campos: {},
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
