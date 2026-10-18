import path from "node:path"
import {
  type Atrule,
  type CssNode,
  type Declaration,
  find,
  generate,
  ident,
  type List,
  type ListItem,
  parse,
  type Rule,
  walk,
} from "css-tree"
import { isImageFile } from "#contract/images"
import { DOCS_DIR } from "#contract/read/files"
import type { PageProblem } from "#contract/read/problems"
import { STYLES_DIR } from "#styles/modules"

// Cleans one style module of a content repository (`content-styles`). The
// repository may be written by anyone, so its CSS is parsed and only an
// allow-list reaches the reader: no at-rule that loads or escapes (`@import`),
// no resource from outside the repository's own images, no script-bearing
// property, and no `<` that could close the `<style>` it is inlined in.
// Names are compared decoded: `u\72l(` is `url(` to a browser.

/** What cleaning a module needs to know about its repository. */
export type StyleModuleContext = {
  /** The module's path relative to the content root (`styles/theme.css`). */
  file: string
  /** The files under `docs/`, relative to it (`img/logo.png`). */
  docsFiles: ReadonlySet<string>
  /** The reader's URL of an image under `docs/`. */
  fileUrlOf: (docsPath: string) => string
}

/** The cleaned CSS and what was removed from it. */
export type CleanedStyleModule = {
  css: string
  problems: PageProblem[]
}

const ALLOWED_AT_RULES = [
  "media",
  "supports",
  "container",
  "layer",
  "keyframes",
  "-webkit-keyframes",
  "font-face",
  "property",
  "scope",
  "starting-style",
]

const ALLOWED_AT_RULES_TEXT =
  "@media, @supports, @container, @layer, @keyframes, @font-face, @property, @scope y @starting-style"

/** Properties that once ran script (old IE and Firefox bindings). */
const BLOCKED_PROPERTIES = ["behavior", "-moz-binding"]

/** Functions whose string arguments are resources the browser fetches. */
const RESOURCE_FUNCTIONS = [
  "url",
  "src",
  "image",
  "image-set",
  "-webkit-image-set",
  "cross-fade",
  "-webkit-cross-fade",
]

/** A `data:` URI of an image or a font. */
const DATA_RESOURCE = /^data:(?:image|font)\/[a-z0-9.+-]+[;,]/i

/** A URL that names its scheme (`https:`, `javascript:`…). */
const SCHEME = /^[a-z][a-z0-9+.-]*:/i

export function cleanStyleModule(
  text: string,
  context: StyleModuleContext
): CleanedStyleModule {
  // css-tree keeps what it cannot parse as `Raw` nodes: those never reach
  // the reader, so only the part that cannot be read is removed.
  const ast = parse(text, { positions: true, parseCustomProperty: true })
  const problems: PageProblem[] = []
  walk(ast, function (node, item, list) {
    const refused = refusalOf(node, context)
    if (refused === undefined) return
    removeFrom(list, item)
    problems.push(problemAt(context, lineOf(node), refused))
    return this.skip
  })
  return { css: withoutLessThan(generate(ast)), problems }
}

/** Why `node` must go, or `undefined` when it stays (its children checked). */
function refusalOf(
  node: CssNode,
  context: StyleModuleContext
): string | undefined {
  if (node.type === "Raw")
    return `Se ha quitado «${excerpt(node.value)}»: la plataforma no puede leer este CSS`
  if (node.type === "Atrule") return atruleRefusal(node)
  if (node.type === "Rule") return ruleRefusal(node)
  if (node.type === "Declaration") return declarationRefusal(node, context)
  return undefined
}

function atruleRefusal(node: Atrule): string | undefined {
  const name = decodedName(node.name)
  if (!ALLOWED_AT_RULES.includes(name))
    return `Se ha quitado «@${name}»: los estilos solo admiten ${ALLOWED_AT_RULES_TEXT}`
  if (node.prelude !== null && hasRaw(node.prelude))
    return `Se ha quitado «@${name}»: la plataforma no puede leer su condición`
  return undefined
}

function ruleRefusal(node: Rule): string | undefined {
  if (!hasRaw(node.prelude)) return undefined
  return `Se ha quitado la regla «${excerpt(generate(node.prelude))}»: la plataforma no puede leer su selector`
}

function declarationRefusal(
  node: Declaration,
  context: StyleModuleContext
): string | undefined {
  const property = decodedName(node.property)
  if (BLOCKED_PROPERTIES.includes(property))
    return `Se ha quitado «${property}»: la plataforma no admite esta propiedad`
  if (hasRaw(node.value))
    return `Se ha quitado «${property}»: la plataforma no puede leer su valor`
  const refused: string[] = []
  walk(node.value, (child) => {
    if (child.type === "Url") {
      const target = resourceTarget(child.value, context)
      if (target === undefined) refused.push(child.value)
      else child.value = target
    }
    if (
      child.type === "Function" &&
      RESOURCE_FUNCTIONS.includes(decodedName(child.name))
    ) {
      for (const argument of child.children) {
        if (argument.type !== "String") continue
        const target = resourceTarget(argument.value, context)
        if (target === undefined) refused.push(argument.value)
        else argument.value = target
      }
    }
  })
  const first = refused[0]
  if (first === undefined) return undefined
  return `Se ha quitado «${property}»: «${first}» no es una imagen de docs/ ni un data: de imagen o fuente`
}

/**
 * The URL the reader serves for `value`: a `data:` image or font and an
 * in-document `#fragment` as they are, a relative path to an existing image
 * under `docs/` as the reader's route; `undefined` for anything else.
 */
function resourceTarget(
  value: string,
  context: StyleModuleContext
): string | undefined {
  const target = value.trim()
  if (target.startsWith("#")) return target
  if (target.toLowerCase().startsWith("data:")) {
    if (DATA_RESOURCE.test(target)) return target
    return undefined
  }
  if (
    SCHEME.test(target) ||
    target.startsWith("/") ||
    target.includes("\\") ||
    target.includes("?")
  )
    return undefined
  const resolved = path.posix.normalize(path.posix.join(STYLES_DIR, target))
  const docsPrefix = `${DOCS_DIR}/`
  if (!resolved.startsWith(docsPrefix)) return undefined
  const docsPath = resolved.slice(docsPrefix.length)
  if (!isImageFile(docsPath) || !context.docsFiles.has(docsPath))
    return undefined
  return context.fileUrlOf(docsPath)
}

/** Whether `node` holds a part css-tree could not parse. */
function hasRaw(node: CssNode): boolean {
  return find(node, (child) => child.type === "Raw") !== null
}

/** The start of a piece of CSS, short enough for a message. */
function excerpt(css: string): string {
  const text = css.trim().replace(/\s+/g, " ")
  if (text.length <= 60) return text
  return `${text.slice(0, 57)}...`
}

/** A name as the browser reads it: escapes decoded, lowercase. */
function decodedName(name: string): string {
  return ident.decode(name).toLowerCase()
}

/** Writes every `<` as the CSS escape `\3c `, which reads back as `<`. */
function withoutLessThan(css: string): string {
  return css.replaceAll("<", "\\3c ")
}

function removeFrom(
  list: List<CssNode> | null,
  item: ListItem<CssNode> | null
): void {
  if (list === null || item === null) return
  list.remove(item)
}

function lineOf(node: CssNode): number | null {
  return node.loc?.start.line ?? null
}

function problemAt(
  context: StyleModuleContext,
  line: number | null,
  message: string
): PageProblem {
  return { file: context.file, line, message }
}
