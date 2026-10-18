import { readFile } from "node:fs/promises"
import path from "node:path"
import type { Element } from "hast"
import { entityPath } from "#contract/catalog/paths"
import type { Catalog } from "#contract/catalog/read"
import type { ContentDeclarations } from "#contract/read/declarations"
import {
  DOCS_DIR,
  docFolderPaths,
  isReservedDocsPath,
  listFiles,
  pagePathOf,
} from "#contract/read/files"
import type { PageProblem } from "#contract/read/problems"
import type { Menu } from "#contract/schema/meta-schema"
import type { ContractVersion } from "#contract/versions/detect"
import { formerNameProblems, v1Problems } from "#contract/versions/former-names"
import { diagramFigure } from "#diagrams/figure"
import type { DiagramFile } from "#diagrams/model"
import { diagramsByEntity, readDiagrams } from "#diagrams/read"
import { arrange, homeEntry, type Site } from "#pages/arrange"
import {
  type CatalogBodyContext,
  catalogPages,
  withCatalogBody,
} from "#pages/catalog-pages"
import { type HeaderSchema, headerSchema, readHeader } from "#pages/header"
import { overridden, withOverride } from "#pages/menu-overrides"
import {
  folderNav,
  type MenuTargets,
  menuNav,
  type NavNode,
  type NavSource,
  OTHERS_TITLE,
  type ResolvedMenu,
  resolveMenu,
} from "#pages/nav"
import { fallbackTitleOf, type Page, type PageHeader } from "#pages/page"
import { type ParsedPage, parsePage } from "#pages/parse"
import { refsIn, reverseRefs } from "#pages/references"
import { pageToHast } from "#pages/to-hast"
import { transformPage } from "#pages/transform"
import { readSkills } from "#skills/read"
import { readStyles } from "#styles/read"

// Reads every page of a repository's docs/, adds the generated catalog pages
// and hands them to `#pages/arrange`, which lays them out behind the home in
// the navigation's order (the groups of menu.yaml, or the folders and the
// catalog without one). Pages are read in two passes: every header first,
// with what menu.yaml says about it applied (`#pages/menu-overrides`), so a
// page can show another page's title, then every body. The repository's style modules (`styles/`) are read with
// them, so their stylesheet follows the same checkout, and so are its skills
// (`skills/`), whose problems go on the home with the site's own.

export type { Breadcrumb, PageLink, Site, SitePage } from "#pages/arrange"
export type { NavEntry, NavNode } from "#pages/nav"

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
  declarations: ContentDeclarations,
  catalog: Catalog,
  routes: SiteRoutes,
  editDates: ReadonlyMap<string, string>
): Promise<Site> {
  const { config, index, menu, contract } = declarations
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
  siteProblems.push(...v1Problems(contract))
  const pagePaths = new Set(mdxFiles.map(pagePathOf))
  const folders = new Set(docFolderPaths(mdxFiles))
  for (const folder of folders) pagePaths.add(folder)
  pagePaths.add("")

  const typeIds = [...catalog.keys()]
  const resolved = resolveMenuOf(
    menu,
    { pages: pagePaths, folders, types: typeIds },
    contract
  )
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

  const schema = headerSchema(config, index, contract)
  const headed: HeadedPage[] = []
  for (const file of mdxFiles) {
    const source = await readFile(path.join(docsRoot, file), "utf8")
    headed.push(
      withOverride(
        headPage(source, file, schema, editDates),
        resolved.overrides,
        contract
      )
    )
  }
  const generated = catalogPages(catalog, editDates)
  for (const [pagePath, page] of generated)
    generated.set(pagePath, overridden(page, resolved.overrides))

  const titles = new Map(headed.map((page) => [page.path, page.header.title]))
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
    const headerRefs = refsIn(page.header.fields, config.header ?? {}).map(
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
  const home = homeEntry(read, config.name)
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

function resolveMenuOf(
  menu: Menu | null,
  targets: MenuTargets,
  contract: ContractVersion
): ResolvedMenu {
  if (menu === null) return { groups: [], overrides: new Map(), problems: [] }
  const pages = new Set(targets.pages)
  pages.delete("")
  return resolveMenu(menu, { ...targets, pages }, contract)
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
