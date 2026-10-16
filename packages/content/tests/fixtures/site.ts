import type { Root } from "hast"
import { toHtml } from "hast-util-to-html"
import { readCatalog } from "#catalog"
import { loadContent } from "#load"
import { readSite, type Site, type SitePage } from "#pages/site"
import { createContentDir } from "#tests/fixtures/content-dir"

/** Routes as the reader builds them for the repository `casa`. */
export const ROUTES = {
  routeOf: (pagePath: string) => `/casa/${pagePath}`.replace(/\/$/, ""),
  fileUrlOf: (docsPath: string) => `/files/casa/${docsPath}`,
}

const CONFIG = [
  "nombre: Casa",
  'plataforma: "1"',
  "cabecera:",
  "  maquinas:",
  "    tipo: lista",
  "    opcional: true",
  "    de: { tipo: ref, a: maquinas }",
].join("\n")

const CATALOG: Record<string, string> = {
  "doc.config.yaml": CONFIG,
  "catalogo/maquinas/_tipo.yaml": [
    "nombre: Máquina",
    "plural: Máquinas",
    "campos:",
    "  ip: { tipo: ip }",
  ].join("\n"),
  "catalogo/maquinas/nas.yaml": "ip: 192.168.1.30\n",
}

/** A page file with a valid header and `body`. */
export function page(titulo: string, body = "", extra = ""): string {
  return `---\ntitulo: ${titulo}\ndescripcion: Sobre ${titulo}\n${extra}---\n\n${body}\n`
}

/**
 * Reads a site made of `files` (paths under the content root) plus the
 * catalog, with `editDates` as the files' last commit dates.
 */
export async function siteOf(
  files: Record<string, string>,
  editDates: ReadonlyMap<string, string> = new Map()
): Promise<Site> {
  const dir = await createContentDir({ ...CATALOG, ...files })
  try {
    const loaded = await loadContent(dir.root)
    if (!loaded.ok) throw new Error(JSON.stringify(loaded.problems))
    return await readSite(
      dir.root,
      loaded.content.config,
      loaded.content.index,
      await readCatalog(dir.root, loaded.content),
      ROUTES,
      loaded.content.menu,
      editDates
    )
  } finally {
    await dir.remove()
  }
}

/** The page at `pagePath`, failing the test when it doesn't exist. */
export function pageAt(site: Site, pagePath: string): SitePage {
  const found = site.pages.get(pagePath)
  if (found === undefined) throw new Error(`No page at "${pagePath}"`)
  return found
}

/** The HTML of a page's tree, `""` without one. */
export function htmlOf(tree: Root | null): string {
  if (tree === null) return ""
  return toHtml(tree)
}

/** The messages of a page's problems. */
export function messagesOf(found: SitePage): string[] {
  return found.problems.map((problem) => problem.message)
}
