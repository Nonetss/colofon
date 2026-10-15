import path from "node:path"
import GithubSlugger from "github-slugger"
import type { Blockquote, Definition, Image, Link, Root } from "mdast"
import type {} from "mdast-util-mdx"
import type {} from "mdast-util-to-hast"
import { toString as textOf } from "mdast-util-to-string"
import { SKIP, visit } from "unist-util-visit"
import type { PageHeading, PageProblem } from "#pages/types"

// Walks a page's syntax tree before it becomes HTML: reports what a page
// cannot use, gives headings their ids, turns `[!KIND]` blockquotes into
// alerts and points links and images at the reader's routes. MDX nodes are
// left in place; `to-hast.ts` drops them or renders them as notices.

/** Image files a page can show, by extension. */
export const IMAGE_EXTENSIONS = [
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "avif",
  "svg",
] as const

export type TransformContext = {
  /** The page file relative to the content root (`docs/red/dns.mdx`). */
  file: string
  /** Its folder under `docs/` (`red`), `""` at the top. */
  folder: string
  /** Page paths that exist (`""` is the home, `red` a section). */
  pages: ReadonlySet<string>
  /** Every file under `docs/`, relative to it (`red/img/zonas.svg`). */
  files: ReadonlySet<string>
  /** The reader route of a page path (`red/dns` → `/casa/red/dns`). */
  routeOf: (pagePath: string) => string
  /** The URL of a file under `docs/` (`red/img/zonas.svg`). */
  fileUrlOf: (docsPath: string) => string
}

const ALERT_TITLES = {
  note: "Nota",
  tip: "Consejo",
  important: "Importante",
  warning: "Aviso",
  caution: "Precaución",
} as const

type AlertKind = keyof typeof ALERT_TITLES

const ALERT_MARKER = /^\[!(note|tip|important|warning|caution)\][ \t]*(\r?\n)?/i

const SCHEME = /^[a-z][a-z0-9+.-]*:/i

export function transformPage(
  tree: Root,
  context: TransformContext
): { headings: PageHeading[]; problems: PageProblem[] } {
  const problems: PageProblem[] = []
  const headings: PageHeading[] = []
  const slugger = new GithubSlugger()
  const report = (line: number | null, message: string) =>
    problems.push({ file: context.file, line, message })

  visit(tree, (node) => {
    const line = node.position?.start.line ?? null
    switch (node.type) {
      case "mdxjsEsm":
        report(line, esmMessage(node.value))
        return SKIP
      case "mdxFlowExpression":
      case "mdxTextExpression":
        if (!isCommentOnly(node.data?.estree?.body.length))
          report(
            line,
            "Las fichas no admiten expresiones entre llaves {…}; para un comentario, {/* … */}"
          )
        return SKIP
      case "mdxJsxFlowElement":
      case "mdxJsxTextElement":
        report(line, componentMessage(node.name))
        return SKIP
      case "heading": {
        if (node.depth === 1) {
          report(
            line,
            "Un título de nivel 1 (#) no va en el cuerpo: el título de la ficha es su `titulo`"
          )
        }
        if (node.depth >= 2 && node.depth <= 4) {
          const text = textOf(node)
          const id = slugger.slug(text)
          node.data = { ...node.data, hProperties: { id } }
          if (node.depth === 2 || node.depth === 3)
            headings.push({ depth: node.depth, id, text })
        }
        return
      }
      case "blockquote":
        toAlert(node)
        return
      case "link":
        resolveLink(node, context, line, report)
        return
      case "definition":
        resolveDefinition(node, context, line, report)
        return
      case "image":
        resolveImage(node, context, line, report)
        return
    }
  })

  return { headings, problems }
}

function isCommentOnly(statements: number | undefined): boolean {
  return statements === 0
}

function esmMessage(value: string): string {
  const keyword = value.trimStart().startsWith("export") ? "export" : "import"
  return `Las fichas no admiten \`${keyword}\`: solo Markdown y los componentes de la plataforma`
}

/** The notice text, also used for the message of the problem. */
export function componentMessage(name: string | null): string {
  if (name === null) return "Las fichas no admiten fragmentos JSX (<>…</>)"
  return `El componente <${name}> no existe en la plataforma`
}

function toAlert(node: Blockquote) {
  const [first] = node.children
  if (first === undefined || first.type !== "paragraph") return
  const [lead] = first.children
  if (lead === undefined || lead.type !== "text") return
  const match = ALERT_MARKER.exec(lead.value)
  if (match === null) return
  const kind = alertKindOf(match[1])
  if (kind === undefined) return
  lead.value = lead.value.slice(match[0].length)
  if (lead.value === "") first.children.shift()
  if (first.children.length === 0) node.children.shift()
  node.children.unshift({
    type: "paragraph",
    children: [{ type: "text", value: ALERT_TITLES[kind] }],
    data: { hProperties: { className: ["doc-alert-title"] } },
  })
  node.data = {
    ...node.data,
    hName: "div",
    hProperties: { className: ["doc-alert", `doc-alert-${kind}`] },
  }
}

function alertKindOf(value: string | undefined): AlertKind | undefined {
  const kind = value?.toLowerCase()
  if (
    kind === "note" ||
    kind === "tip" ||
    kind === "important" ||
    kind === "warning" ||
    kind === "caution"
  )
    return kind
  return undefined
}

type Report = (line: number | null, message: string) => void

/** Where a relative URL leads, once checked against the repository. */
type Target =
  | { kind: "keep" }
  | { kind: "url"; url: string }
  | { kind: "broken"; message: string }

function resolveTarget(
  url: string,
  context: TransformContext,
  imagesOnly: boolean
): Target {
  if (url === "" || url.startsWith("#") || url.startsWith("/"))
    return { kind: "keep" }
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

function resolveLink(
  node: Link,
  context: TransformContext,
  line: number | null,
  report: Report
) {
  const target = resolveTarget(node.url, context, false)
  if (target.kind === "keep") return
  if (target.kind === "url") {
    node.url = target.url
    return
  }
  report(line, `Enlace roto: ${target.message}`)
  node.url = ""
  node.data = {
    ...node.data,
    hName: "span",
    hProperties: { className: ["doc-broken-link"] },
  }
}

function resolveDefinition(
  node: Definition,
  context: TransformContext,
  line: number | null,
  report: Report
) {
  const target = resolveTarget(node.url, context, false)
  if (target.kind === "keep") return
  if (target.kind === "url") {
    node.url = target.url
    return
  }
  report(line, `Enlace roto: ${target.message}`)
  node.url = ""
}

function resolveImage(
  node: Image,
  context: TransformContext,
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

/** `red/dns.mdx` → `red/dns`, `red/index.mdx` → `red`, `index.mdx` → `""`. */
export function pagePathOf(file: string): string {
  const withoutExt = file.slice(0, -".mdx".length)
  if (withoutExt === "index") return ""
  if (withoutExt.endsWith("/index"))
    return withoutExt.slice(0, -"/index".length)
  return withoutExt
}

/** Whether a file under `docs/` is an image a page can show. */
export function isImageFile(file: string): boolean {
  const extension = path.posix.extname(file).slice(1).toLowerCase()
  return IMAGE_EXTENSIONS.some((allowed) => allowed === extension)
}
