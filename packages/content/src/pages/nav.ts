import path from "node:path"
import { catalogTypePath } from "#contract/catalog-paths"
import { CATALOG_DIR, CATALOG_PATH, DOCS_DIR, MENU_FILE } from "#contract/load"
import type { Menu, MenuEntry } from "#contract/meta-schema"
import type { PageProblem } from "#contract/problems"
import { pagePathOf } from "#pages/transform"
import type { Page } from "#pages/types"

// The navigation of a repository. Without `menu.yaml` it is the folders of
// docs/ (each folder a section, or a page when it holds only its index,
// ordered by `orden` then by title) followed by
// the catalog. With a menu, the top level is its groups, each holding the
// pages, folders and catalog pages its entries name, in the order written;
// whatever no entry shows goes to a last "Otros" group. Entries naming
// nothing, the home or something an earlier entry already shows are reported
// on `menu.yaml` and skipped, so one renamed page never loses the menu.

/** A page or section as the navigation lists it. */
export type NavEntry = {
  path: string
  title: string
  description: string
  icon: string | null
}

/** A group of `menu.yaml`: a heading, not a route. */
export type NavGroup = {
  kind: "group"
  title: string
  description: string
  icon: string | null
  children: NavNode[]
}

export type NavNode =
  | ({ kind: "page" } & NavEntry)
  | ({ kind: "section"; children: NavNode[] } & NavEntry)
  | NavGroup

/** The title and icon `menu.yaml` gives an entry; they win over its header. */
export type MenuOverride = { title: string | null; icon: string | null }

/** What a menu entry names. */
type EntryTarget = "page" | "folder" | "catalog" | "type"

type ResolvedEntry = { path: string; target: EntryTarget }

type ResolvedGroup = {
  title: string
  description: string
  icon: string | null
  entries: ResolvedEntry[]
}

/** A menu whose entries were checked against what the repository holds. */
export type ResolvedMenu = {
  groups: ResolvedGroup[]
  /** Titles and icons the entries set, by path. */
  overrides: ReadonlyMap<string, MenuOverride>
  problems: PageProblem[]
}

/** The paths a menu entry may name. */
export type MenuTargets = {
  /** Pages of docs/ (`red/dns`), without the home. */
  pages: ReadonlySet<string>
  /** Folders of docs/ that hold pages (`red`). */
  folders: ReadonlySet<string>
  /** Catalog type ids. */
  types: readonly string[]
}

/** The title shown for the group of pages the menu leaves out. */
export const OTHERS_TITLE = "Otros"

function entryPath(entry: MenuEntry): string {
  if (typeof entry === "string") return entry
  return entry.ruta
}

function entryOverride(entry: MenuEntry): MenuOverride | undefined {
  if (typeof entry === "string") return undefined
  if (entry.titulo === undefined && entry.icono === undefined) return undefined
  return { title: entry.titulo ?? null, icon: entry.icono ?? null }
}

function targetOf(
  entryValue: string,
  targets: MenuTargets
): EntryTarget | undefined {
  if (entryValue === CATALOG_PATH) return "catalog"
  if (targets.types.some((typeId) => catalogTypePath(typeId) === entryValue))
    return "type"
  if (targets.folders.has(entryValue)) return "folder"
  if (targets.pages.has(entryValue)) return "page"
  return undefined
}

/** Whether `inner` is `outer` or below it. */
function isWithin(inner: string, outer: string): boolean {
  return inner === outer || inner.startsWith(`${outer}/`)
}

/** Checks every entry of `menu` against what the repository holds. */
export function resolveMenu(menu: Menu, targets: MenuTargets): ResolvedMenu {
  const problems: PageProblem[] = []
  const overrides = new Map<string, MenuOverride>()
  const accepted: string[] = []
  const report = (at: string, message: string) =>
    problems.push({ file: MENU_FILE, line: null, message: `${at}: ${message}` })

  const groups = menu.secciones.map((group, groupAt) => {
    const entries: ResolvedEntry[] = []
    group.paginas.forEach((entry, entryAt) => {
      const at = `secciones.${groupAt}.paginas.${entryAt}`
      const value = entryPath(entry)
      if (value === "" || value === "index") {
        report(at, "la portada no va en el menú: sale siempre como «Inicio»")
        return
      }
      const target = targetOf(value, targets)
      if (target === undefined) {
        report(
          at,
          `\`${value}\` no es ninguna página ni carpeta de docs/, ni catalogo, ni un tipo del catálogo`
        )
        return
      }
      const earlier = accepted.find(
        (shown) => isWithin(value, shown) || isWithin(shown, value)
      )
      if (earlier !== undefined) {
        report(at, `\`${value}\` ya sale en el menú con \`${earlier}\``)
        return
      }
      accepted.push(value)
      entries.push({ path: value, target })
      const override = entryOverride(entry)
      if (override !== undefined) overrides.set(value, override)
    })
    return {
      title: group.titulo,
      description: group.descripcion ?? "",
      icon: group.icono ?? null,
      entries,
    }
  })
  return { groups, overrides, problems }
}

/** What the navigation is built from. */
export type NavSource = {
  /** Every page read or generated, by path, with its effective header. */
  read: ReadonlyMap<string, Page>
  /** The `.mdx` files of docs/ (relative to it), the reserved ones left out. */
  mdxFiles: readonly string[]
  /** The catalog type ids, each with a generated page. */
  typeIds: readonly string[]
  /** Titles and icons the menu gives, for folders without an `index.mdx`. */
  overrides: ReadonlyMap<string, MenuOverride>
}

/** The navigation of a repository without `menu.yaml`. */
export function folderNav(source: NavSource): NavNode[] {
  const nodes = buildTree("", source, source.mdxFiles)
  if (source.typeIds.length > 0)
    nodes.push(catalogSection(source, source.typeIds))
  return nodes
}

/** A page the menu leaves for "Otros", with the file its problem names. */
export type LeftOut = { path: string; file: string }

/**
 * The navigation of a repository with a valid `menu.yaml`, and the pages left
 * for "Otros" (catalog type pages included).
 */
export function menuNav(
  menu: ResolvedMenu,
  source: NavSource
): { nav: NavNode[]; leftOut: LeftOut[] } {
  const nav: NavNode[] = menu.groups.map((group) => ({
    kind: "group",
    title: group.title,
    description: group.description,
    icon: group.icon,
    children: group.entries.map((entry) => entryNode(entry, source)),
  }))

  const shown = menu.groups.flatMap((group) =>
    group.entries.map((entry) => entry.path)
  )
  const isShown = (pagePath: string) =>
    shown.some((shownPath) => isWithin(pagePath, shownPath))
  const leftFiles = source.mdxFiles.filter((file) => {
    const pagePath = pagePathOf(file)
    return pagePath !== "" && !isShown(pagePath)
  })
  const leftTypes = source.typeIds.filter(
    (typeId) => !isShown(catalogTypePath(typeId))
  )
  const others = buildTree("", source, leftFiles)
  if (leftTypes.length > 0) others.push(catalogSection(source, leftTypes))
  if (others.length > 0) {
    nav.push({
      kind: "group",
      title: OTHERS_TITLE,
      description: "Páginas que aún no están en menu.yaml",
      icon: null,
      children: others,
    })
  }
  const leftOut = [
    ...leftFiles.map((file) => ({
      path: pagePathOf(file),
      file: `${DOCS_DIR}/${file}`,
    })),
    ...leftTypes.map((typeId) => ({
      path: catalogTypePath(typeId),
      file: `${CATALOG_DIR}/${typeId}`,
    })),
  ]
  return { nav, leftOut }
}

function entryNode(entry: ResolvedEntry, source: NavSource): NavNode {
  switch (entry.target) {
    case "catalog":
      return catalogSection(source, source.typeIds)
    case "folder":
      return folderNode(
        entry.path,
        path.posix.basename(entry.path),
        source,
        source.mdxFiles
      )
    case "page":
    case "type":
      return { kind: "page", ...entryOf(entry.path, source, entry.path) }
  }
}

/** The catalog section: one page per type, ordered by title. */
function catalogSection(
  source: NavSource,
  typeIds: readonly string[]
): NavNode {
  const children: NavNode[] = typeIds
    .map((typeId) => {
      const typePath = catalogTypePath(typeId)
      const node: NavNode = {
        kind: "page",
        ...entryOf(typePath, source, typeId),
      }
      return node
    })
    .sort((a, b) => collator.compare(a.title, b.title))
  return {
    kind: "section",
    ...entryOf(CATALOG_PATH, source, CATALOG_PATH),
    children,
  }
}

function entryOf(
  pagePath: string,
  source: NavSource,
  fallbackTitle: string
): NavEntry {
  const page = source.read.get(pagePath)
  if (page !== undefined)
    return {
      path: pagePath,
      title: page.header.titulo,
      description: page.header.descripcion,
      icon: page.header.icono,
    }
  const override = source.overrides.get(pagePath)
  return {
    path: pagePath,
    title: overriddenTitle(override, fallbackTitle),
    description: "",
    icon: override?.icon ?? null,
  }
}

function overriddenTitle(
  override: MenuOverride | undefined,
  fallback: string
): string {
  if (override === undefined || override.title === null) return fallback
  return override.title
}

/** The sections and pages directly in `folder`, ordered. */
function buildTree(
  folder: string,
  source: NavSource,
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
      node: { kind: "page", ...entryOf(pagePath, source, pagePath) },
      order: orderOf(source.read.get(pagePath)),
    })
  }
  for (const name of subfolders) {
    const sectionPath = joinPath(folder, name)
    nodes.push({
      node: folderNode(sectionPath, name, source, mdxFiles),
      order: orderOf(source.read.get(sectionPath)),
    })
  }
  return nodes.sort(byOrderThenTitle).map((entry) => entry.node)
}

/**
 * A folder of docs/: a section with its subtree, or a page when its only
 * page is its `index.mdx`, so it never shows as a section with nothing in it.
 */
function folderNode(
  folder: string,
  fallbackTitle: string,
  source: NavSource,
  mdxFiles: readonly string[]
): NavNode {
  const entry = entryOf(folder, source, fallbackTitle)
  if (!holdsPages(folder, mdxFiles)) return { kind: "page", ...entry }
  return {
    kind: "section",
    ...entry,
    children: buildTree(folder, source, mdxFiles),
  }
}

/** Whether `folder` holds a page besides its own `index.mdx`. */
function holdsPages(folder: string, mdxFiles: readonly string[]): boolean {
  return mdxFiles.some((file) => {
    const relative = relativeTo(folder, file)
    return relative !== undefined && relative !== "index.mdx"
  })
}

function relativeTo(folder: string, file: string): string | undefined {
  if (folder === "") return file
  if (!file.startsWith(`${folder}/`)) return undefined
  return file.slice(folder.length + 1)
}

export function joinPath(folder: string, name: string): string {
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
