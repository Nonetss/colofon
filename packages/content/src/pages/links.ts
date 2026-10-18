import path from "node:path"
import type { Definition, Image, Link } from "mdast"
import type {} from "mdast-util-to-hast"
import {
  catalogTypePath,
  entityPagePath,
  entityPath,
} from "#contract/catalog/paths"
import type { Catalog } from "#contract/catalog/read"
import { isImageFile } from "#contract/images"
import { pagePathOf } from "#contract/read/files"

// The links and images of a page, resolved against the repository: a
// relative `.mdx` link to that page's reader route, a `catalog:` link to an
// entity's or a type's page (noting the entity as cited), a relative image
// to the repository's file URL. What leads nowhere is reported and rendered
// as plain text.

/** What resolving a page's links needs, and where it notes the entities cited. */
export type LinkContext = {
  /** The page's folder under `docs/` (`red`), `""` at the top. */
  folder: string
  /** Page paths that exist (`""` is the home, `red` a section). */
  pages: ReadonlySet<string>
  /** Every file under `docs/`, relative to it (`red/img/zonas.svg`). */
  files: ReadonlySet<string>
  /** The catalog `catalog:` links read from. */
  catalog: Catalog
  /** The reader route of a page path (`red/dns` → `/casa/red/dns`). */
  routeOf: (pagePath: string) => string
  /** The URL of a file under `docs/` (`red/img/zonas.svg`). */
  fileUrlOf: (docsPath: string) => string
  cite: (entityKey: string) => void
}

/** A URL with a scheme of its own (`https:`, `mailto:`), kept as written. */
const SCHEME = /^[a-z][a-z0-9+.-]*:/i

export type Report = (line: number | null, message: string) => void

/** Where a relative URL leads, once checked against the repository. */
type Target =
  | { kind: "keep" }
  | { kind: "url"; url: string }
  | { kind: "broken"; message: string }

const CATALOG_SCHEME = "catalog:"

/**
 * `catalog:<type>/<id>`: the entity's page, or its generated catalog page
 * when it has none. `catalog:<type>`: the type's generated page.
 */
function entityTarget(url: string, context: LinkContext): Target {
  const [typeId = "", id, ...rest] = url.slice(CATALOG_SCHEME.length).split("/")
  const type = context.catalog.get(typeId)
  if (rest.length === 0 && id === undefined && type !== undefined)
    return { kind: "url", url: context.routeOf(catalogTypePath(typeId)) }
  const entity = type?.entities.get(id ?? "")
  if (rest.length > 0 || entity === undefined)
    return {
      kind: "broken",
      message: `${url} no es ninguna entidad del catálogo`,
    }
  context.cite(entityPath(typeId, entity.id))
  return { kind: "url", url: context.routeOf(entityPagePath(entity)) }
}

function resolveTarget(
  url: string,
  context: LinkContext,
  imagesOnly: boolean
): Target {
  if (url === "" || url.startsWith("#") || url.startsWith("/"))
    return { kind: "keep" }
  if (url.startsWith(CATALOG_SCHEME)) {
    if (imagesOnly)
      return { kind: "broken", message: `${url} no es una imagen` }
    return entityTarget(url, context)
  }
  if (SCHEME.test(url)) return { kind: "keep" }
  const [target = "", hash] = splitHash(url)
  const relative = path.posix.normalize(
    path.posix.join(context.folder, decode(target))
  )
  if (relative === ".." || relative.startsWith("../"))
    return { kind: "broken", message: `${url} queda fuera de docs/` }
  if (!imagesOnly && relative.endsWith(".mdx")) {
    const page = pagePathOf(relative)
    if (!context.pages.has(page))
      return { kind: "broken", message: `${url} no es ninguna ficha` }
    return { kind: "url", url: withHash(context.routeOf(page), hash) }
  }
  if (isImageFile(relative)) {
    if (!context.files.has(relative))
      return { kind: "broken", message: `${url} no existe` }
    return { kind: "url", url: context.fileUrlOf(relative) }
  }
  if (imagesOnly) return { kind: "broken", message: `${url} no es una imagen` }
  return {
    kind: "broken",
    message: `${url}: solo se enlazan fichas (.mdx) e imágenes`,
  }
}

export function resolveLink(
  node: Link,
  context: LinkContext,
  line: number | null,
  report: Report
) {
  const target = resolveTarget(node.url, context, false)
  if (target.kind === "keep") return
  if (target.kind === "url") {
    node.url = target.url
    return
  }
  node.url = ""
  report(line, `Enlace roto: ${target.message}`)
  node.data = {
    ...node.data,
    hName: "span",
    hProperties: { className: ["doc-broken-link"] },
  }
}

export function resolveDefinition(
  node: Definition,
  context: LinkContext,
  line: number | null,
  report: Report
) {
  const target = resolveTarget(node.url, context, false)
  if (target.kind === "keep") return
  if (target.kind === "url") {
    node.url = target.url
    return
  }
  node.url = ""
  report(line, `Enlace roto: ${target.message}`)
}

export function resolveImage(
  node: Image,
  context: LinkContext,
  line: number | null,
  report: Report
) {
  const target = resolveTarget(node.url, context, true)
  if (target.kind === "keep") return
  if (target.kind === "url") {
    node.url = target.url
    return
  }
  report(line, `Imagen rota: ${target.message}`)
  node.url = ""
  node.data = {
    ...node.data,
    hName: "span",
    hProperties: { className: ["doc-broken-image"] },
    hChildren: [{ type: "text", value: node.alt ?? "" }],
  }
}

function splitHash(url: string): [string, string | undefined] {
  const at = url.indexOf("#")
  if (at === -1) return [url, undefined]
  return [url.slice(0, at), url.slice(at + 1)]
}

function withHash(url: string, hash: string | undefined): string {
  if (hash === undefined || hash === "") return url
  return `${url}#${hash}`
}

function decode(value: string): string {
  try {
    return decodeURI(value)
  } catch {
    return value
  }
}
