import GithubSlugger from "github-slugger"
import type { Element } from "hast"
import type { Blockquote, Code, Paragraph, Root } from "mdast"
import type { MdxJsxFlowElement, MdxJsxTextElement } from "mdast-util-mdx"
import type {} from "mdast-util-to-hast"
import { toString as textOf } from "mdast-util-to-string"
import { SKIP, visit } from "unist-util-visit"
import type { Catalog } from "#contract/catalog/read"
import type { PageProblem } from "#contract/read/problems"
import { diagramFigure } from "#diagrams/figure"
import type { DiagramFile } from "#diagrams/model"
import { ENTITIES, entitiesTable } from "#pages/entities"
import { componentNotice } from "#pages/hast"
import {
  type Report,
  resolveDefinition,
  resolveImage,
  resolveLink,
} from "#pages/links"
import type { PageHeading } from "#pages/page"

// Walks a page's syntax tree before it becomes HTML: reports what a page
// cannot use, gives headings their ids, turns `[!KIND]` blockquotes into
// alerts and points links and images at the reader's routes (`links.ts`). The platform's
// components are replaced here: `<Callout>` by an alert, `<Entities>` by its
// catalog table (`entities.ts`) and `<Diagram>` by its figure
// (`diagrams/figure.ts`); a ```diagram block, which belongs in diagrams/, by a
// notice. Other MDX nodes are left in place and `to-hast.ts` drops them or
// renders them as notices.

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
  /** The catalog `<Entities>` and `catalog:` links read from. */
  catalog: Catalog
  /** The title of a page path, for links that show it. */
  titleOf: (pagePath: string) => string
  /** The diagrams `<Diagram>` shows, by id. */
  diagrams: ReadonlyMap<string, DiagramFile>
}

const ALERT_TITLES = {
  note: "Nota",
  tip: "Consejo",
  important: "Importante",
  warning: "Aviso",
  caution: "Precaución",
} as const

type AlertKind = keyof typeof ALERT_TITLES

/** The component pages may use, rendered as an alert. */
const CALLOUT = "Callout"

/** The component that shows a diagram of diagrams/. */
const DIAGRAM = "Diagram"

/** `<Callout type="…">`: the alert kind and default title of each type. */
const CALLOUT_TYPES = {
  note: { kind: "note", title: ALERT_TITLES.note },
  info: { kind: "note", title: "Información" },
  tip: { kind: "tip", title: ALERT_TITLES.tip },
  important: { kind: "important", title: ALERT_TITLES.important },
  warning: { kind: "warning", title: ALERT_TITLES.warning },
  caution: { kind: "caution", title: ALERT_TITLES.caution },
  danger: { kind: "caution", title: "Peligro" },
} as const satisfies Record<string, { kind: AlertKind; title: string }>

type CalloutType = keyof typeof CALLOUT_TYPES

const ALERT_MARKER = /^\[!(note|tip|important|warning|caution)\][ \t]*(\r?\n)?/i

export function transformPage(
  tree: Root,
  pageContext: TransformContext
): {
  headings: PageHeading[]
  problems: PageProblem[]
  /** The generated pages of the entities its `catalog:` links name. */
  citations: string[]
} {
  const citations = new Set<string>()
  const context: LinkContext = {
    ...pageContext,
    cite: (entityKey) => citations.add(entityKey),
  }
  const problems: PageProblem[] = []
  const headings: PageHeading[] = []
  const slugger = new GithubSlugger()
  const report = (line: number | null, message: string) =>
    problems.push({ file: context.file, line, message })

  // A callout is visited next for the links inside; a table needs nothing.
  const toBlock = (node: MdxJsxFlowElement, line: number | null) => {
    if (node.name === ENTITIES) return toEntities(node, context, line, report)
    if (node.name === DIAGRAM) return toDiagram(node, context, line, report)
    return toCallout(node, line, report)
  }

  visit(tree, (node, index, parent) => {
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
        if (
          !isBlockComponent(node.name) ||
          parent === undefined ||
          index === undefined
        ) {
          report(line, componentMessage(node.name))
          return SKIP
        }
        parent.children.splice(index, 1, toBlock(node, line))
        return [SKIP, nextIndex(node, index)]
      case "mdxJsxTextElement":
        report(line, componentMessage(node.name, "inline"))
        return SKIP
      case "paragraph": {
        // A component on a line of its own (`<Callout>…</Callout>`) reads as
        // a paragraph holding just that element: it is a block all the same.
        const component = soleComponent(node)
        if (component === null || parent === undefined || index === undefined)
          return
        parent.children.splice(index, 1, toBlock(component, line))
        return [SKIP, nextIndex(component, index)]
      }
      case "heading": {
        if (node.depth === 1) {
          report(
            line,
            "Un título de nivel 1 (#) no va en el cuerpo: el título de la ficha va en su cabecera"
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
      case "code":
        if (
          node.lang !== "diagram" ||
          parent === undefined ||
          index === undefined
        )
          return
        report(line, DIAGRAM_FENCE_MESSAGE)
        parent.children.splice(
          index,
          1,
          noticeBlock(DIAGRAM_FENCE_MESSAGE, node)
        )
        return SKIP
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

  return { headings, problems, citations: [...citations] }
}

/** A page's context while its links are resolved, noting the entities cited. */
type LinkContext = TransformContext & { cite: (entityKey: string) => void }

function isCommentOnly(statements: number | undefined): boolean {
  return statements === 0
}

function esmMessage(value: string): string {
  const keyword = value.trimStart().startsWith("export") ? "export" : "import"
  return `Las fichas no admiten \`${keyword}\`: solo Markdown y los componentes de la plataforma`
}

/** The components the platform provides, each written as a block. */
const BLOCK_COMPONENTS: ReadonlySet<string> = new Set([
  CALLOUT,
  ENTITIES,
  DIAGRAM,
])

/** What a ```diagram block is told: diagrams live in their own files. */
const DIAGRAM_FENCE_MESSAGE =
  'Los diagramas van en diagrams/<id>.json y se muestran con <Diagram id="…" />'

/** A block that renders as the platform's notice, holding `message`. */
function noticeBlock(message: string, node: Code): Blockquote {
  return {
    type: "blockquote",
    children: [],
    position: node.position,
    data: {
      hName: "div",
      hProperties: { className: ["doc-component-notice"] },
      hChildren: [{ type: "text", value: message }],
    },
  }
}

/** A `<Diagram id="…">` as a node that becomes its figure, or its notice. */
function toDiagram(
  node: MdxJsxFlowElement,
  context: LinkContext,
  line: number | null,
  report: Report
): Blockquote {
  const { element, problems } = diagramElement(node.attributes, context)
  for (const message of problems) report(line, message)
  return {
    type: "blockquote",
    children: [],
    position: node.position,
    data: {
      hName: element.tagName,
      hProperties: element.properties,
      hChildren: element.children,
    },
  }
}

/** The figure of the diagram `<Diagram>` names, or a notice saying why not. */
function diagramElement(
  attributes: MdxJsxFlowElement["attributes"],
  context: LinkContext
): { element: Element; problems: string[] } {
  const problems: string[] = []
  let id: string | null = null
  for (const attribute of attributes) {
    if (attribute.type !== "mdxJsxAttribute") {
      problems.push(`<${DIAGRAM}> no admite atributos entre llaves {…}`)
      continue
    }
    if (attribute.name !== "id") {
      problems.push(`<${DIAGRAM}> no tiene el atributo ${attribute.name}`)
      continue
    }
    if (typeof attribute.value !== "string") {
      problems.push(`El atributo id de <${DIAGRAM}> va entre comillas`)
      continue
    }
    id = attribute.value
  }
  const known = [...context.diagrams.keys()].join(", ")
  if (id === null) {
    const message = `<${DIAGRAM}> necesita id, el nombre de un fichero de diagrams/ (hay: ${known})`
    return {
      element: componentNotice(DIAGRAM, message),
      problems: [...problems, message],
    }
  }
  const found = context.diagrams.get(id)
  if (found === undefined || found.diagram === null) {
    const message = `<${DIAGRAM} id="${id}">: no hay ningún diagrams/${id}.json ni diagrams/${id}.svg que se pueda leer (hay: ${known})`
    const fileProblems = (found?.problems ?? []).map(
      (problem) => `${problem.file}: ${problem.message}`
    )
    return {
      element: componentNotice(DIAGRAM, message),
      problems: [...problems, message, ...fileProblems],
    }
  }
  for (const problem of found.problems)
    problems.push(`${problem.file}: ${problem.message}`)
  return { element: diagramFigure(found.diagram, context.routeOf), problems }
}

function isBlockComponent(name: string | null): name is string {
  return name !== null && BLOCK_COMPONENTS.has(name)
}

/** Where the visit goes on after a component is replaced by its block. */
function nextIndex(node: MdxJsxFlowElement, index: number): number {
  if (node.name === ENTITIES || node.name === DIAGRAM) return index + 1
  return index
}

/** An `<Entities>` as a node that becomes its table, or its notice. */
function toEntities(
  node: MdxJsxFlowElement,
  context: TransformContext,
  line: number | null,
  report: Report
): Blockquote {
  const { element, problems } = entitiesTable(node.attributes, context)
  for (const message of problems) report(line, message)
  return {
    type: "blockquote",
    children: [],
    position: node.position,
    data: {
      hName: element.tagName,
      hProperties: element.properties,
      hChildren: element.children,
    },
  }
}

/**
 * The notice text, also used for the message of the problem. A platform
 * component inside a paragraph is refused for where it is, not for what it
 * is.
 */
export function componentMessage(
  name: string | null,
  placement: "block" | "inline" = "block"
): string {
  if (name === null) return "Las fichas no admiten fragmentos JSX (<>…</>)"
  if (isBlockComponent(name) && placement === "inline")
    return `El componente <${name}> va en su propio bloque, con una línea en blanco antes y después`
  return `El componente <${name}> no existe en la plataforma`
}

function isCalloutType(value: string): value is CalloutType {
  return Object.hasOwn(CALLOUT_TYPES, value)
}

/** The `type` and `title` a `<Callout>` was written with, checked. */
function calloutOptions(
  node: MdxJsxFlowElement,
  line: number | null,
  report: Report
): { type: CalloutType; title: string | null } {
  let type: CalloutType = "note"
  let title: string | null = null
  for (const attribute of node.attributes) {
    if (attribute.type !== "mdxJsxAttribute") {
      report(line, `<${CALLOUT}> no admite atributos entre llaves {…}`)
      continue
    }
    const { name, value } = attribute
    if (typeof value !== "string") {
      report(line, `El atributo ${name} de <${CALLOUT}> va entre comillas`)
      continue
    }
    if (name === "type" && isCalloutType(value)) type = value
    else if (name === "type")
      report(
        line,
        `<${CALLOUT} type="${value}">: el tipo es ${Object.keys(CALLOUT_TYPES).join(", ")}`
      )
    else if (name === "title") title = value
    else report(line, `<${CALLOUT}> no tiene el atributo ${name}`)
  }
  return { type, title }
}

function isBlank(node: Paragraph["children"][number]): boolean {
  return node.type === "text" && node.value.trim() === ""
}

/** The component a paragraph holds alone, as the block it stands for. */
function soleComponent(paragraph: Paragraph): MdxJsxFlowElement | null {
  const content = paragraph.children.filter((child) => !isBlank(child))
  const [only] = content
  if (content.length !== 1 || only === undefined) return null
  if (only.type !== "mdxJsxTextElement" || !isBlockComponent(only.name))
    return null
  return asBlock(only, paragraph)
}

function asBlock(
  element: MdxJsxTextElement,
  paragraph: Paragraph
): MdxJsxFlowElement {
  return {
    type: "mdxJsxFlowElement",
    name: element.name,
    attributes: element.attributes,
    children: [{ type: "paragraph", children: element.children }],
    position: paragraph.position,
  }
}

function titleOr(title: string | null, fallback: string): string {
  if (title === null) return fallback
  return title
}

/** A `<Callout>` as the alert a `[!KIND]` blockquote becomes. */
function toCallout(
  node: MdxJsxFlowElement,
  line: number | null,
  report: Report
): Blockquote {
  const { type, title } = calloutOptions(node, line, report)
  const { kind, title: defaultTitle } = CALLOUT_TYPES[type]
  const heading: Paragraph = {
    type: "paragraph",
    children: [{ type: "text", value: titleOr(title, defaultTitle) }],
    data: { hProperties: { className: ["doc-alert-title"] } },
  }
  return {
    type: "blockquote",
    children: [heading, ...node.children],
    position: node.position,
    data: {
      hName: "div",
      hProperties: { className: ["doc-alert", `doc-alert-${kind}`] },
    },
  }
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
