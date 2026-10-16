import type { Element, ElementContent, Root, RootContent } from "hast"
import { toHtml } from "hast-util-to-html"
import { codeTokens } from "@/features/docs/page/model/code-highlight"
import {
  type SectionKind,
  sectionKindOf,
} from "@/features/docs/page/model/sections"

// Turns a page tree from the API (already sanitized by the backend) into the
// HTML the reader shows. Only presentation is added here: frames around code
// and tables, TanStack Highlight spans inside fenced blocks, the copy button,
// the button that enlarges a drawn diagram,
// anchors on headings, zoomable lazy images, new tabs for links that leave
// the site, and the known sections (`sections.ts`) split apart so the page
// can dress them.

const ANCHORED_HEADINGS = new Set(["h2", "h3", "h4"])

function element(
  tagName: string,
  properties: Element["properties"],
  children: ElementContent[]
): Element {
  return { type: "element", tagName, properties, children }
}

function text(value: string): ElementContent {
  return { type: "text", value }
}

/** `language-yaml` → `yaml`, from a `<pre>`'s `<code>`. */
function languageOf(pre: Element): string | null {
  const [code] = pre.children
  if (code === undefined || code.type !== "element") return null
  const classes = code.properties.className
  if (!Array.isArray(classes)) return null
  for (const name of classes) {
    if (typeof name === "string" && name.startsWith("language-"))
      return name.slice("language-".length)
  }
  return null
}

/** The block's text as coloured spans. Plain tokens stay text. */
function highlighted(code: string, language: string | null): ElementContent[] {
  const children: ElementContent[] = []
  for (const token of codeTokens(code, language)) {
    if (token.value === "") continue
    if (token.className === undefined) {
      children.push(text(token.value))
      continue
    }
    children.push(
      element("span", { className: ["th-token", `th-${token.className}`] }, [
        text(token.value),
      ])
    )
  }
  return children
}

/** The `<code>` inside a fence, with its text replaced by token spans. */
function highlightCode(pre: Element): Element {
  const [code] = pre.children
  if (code === undefined || code.type !== "element" || code.tagName !== "code")
    return pre
  return {
    ...pre,
    children: [
      { ...code, children: highlighted(textOf(code), languageOf(pre)) },
    ],
  }
}

/**
 * An icon of the page's sprite (`doc-body.astro` draws each one once), so the
 * server's HTML carries the registry's Lucide icons without React.
 */
function icon(name: string): Element {
  return element(
    "svg",
    { className: ["doc-icon"], ariaHidden: "true", focusable: "false" },
    [element("use", { href: `#doc-icon-${name}` }, [])]
  )
}

/**
 * An icon-only control of the page: its `aria-label` names it, and `data-hint`
 * is the bubble CSS shows on hover and focus (`Hint`'s look, without React).
 */
function iconButton(
  properties: Element["properties"],
  label: string,
  hint: string,
  icons: ElementContent[]
): Element {
  return element(
    "button",
    { type: "button", ariaLabel: label, dataHint: hint, ...properties },
    icons
  )
}

function codeFrame(pre: Element): Element {
  const language = languageOf(pre)
  const label: ElementContent[] = []
  if (language !== null)
    label.push(
      element("span", { className: ["doc-code-language"] }, [text(language)])
    )
  return element("div", { className: ["doc-code"] }, [
    element("div", { className: ["doc-code-bar"], dataMdSkip: true }, [
      ...label,
      iconButton(
        { className: ["doc-code-copy"], dataCopy: true },
        "Copiar código",
        "Copiar",
        [icon("copy"), icon("check")]
      ),
    ]),
    highlightCode(pre),
  ])
}

/** The text of a node and everything under it. */
function textOf(node: RootContent | ElementContent): string {
  if (node.type === "text") return node.value
  if (node.type !== "element") return ""
  return node.children.map(textOf).join("")
}

/** The first header cell of a table, searched through its rows. */
function firstHeaderCell(node: Element): Element | null {
  for (const child of node.children) {
    if (child.type !== "element") continue
    if (child.tagName === "th") return child
    const found = firstHeaderCell(child)
    if (found !== null) return found
  }
  return null
}

/**
 * A key/value table (`| | |`, with an empty first header cell) reads as fact
 * rows without a header.
 */
function isKeyValue(table: Element): boolean {
  const cell = firstHeaderCell(table)
  if (cell === null) return false
  return textOf(cell).trim() === ""
}

function tableFrame(table: Element): Element {
  return element(
    "div",
    {
      className: ["typeset-scroll", "doc-table"],
      dataTableKv: isKeyValue(table),
    },
    [table]
  )
}

/** A drawn diagram (`<figure class="doc-diagram" data-drawn>`). */
function isDrawnDiagram(node: Element): boolean {
  if (node.tagName !== "figure") return false
  if (node.properties.dataDrawn === undefined) return false
  const classes = node.properties.className
  return Array.isArray(classes) && classes.includes("doc-diagram")
}

/** A drawn diagram with the button that opens it in the lightbox. */
function diagramFrame(figure: Element): Element {
  return {
    ...figure,
    children: [
      ...figure.children.map(decorate),
      iconButton(
        {
          className: ["doc-diagram-expand"],
          dataDiagramExpand: true,
          dataMdSkip: true,
        },
        "Ampliar diagrama",
        "Ampliar",
        [icon("expand")]
      ),
    ],
  }
}

function isExternal(href: unknown): boolean {
  return typeof href === "string" && /^https?:\/\//i.test(href)
}

function withAnchor(heading: Element): Element {
  const id = heading.properties.id
  if (typeof id !== "string") return heading
  return {
    ...heading,
    children: [
      ...heading.children.map(decorate),
      element(
        "a",
        {
          href: `#${id}`,
          className: ["doc-anchor"],
          ariaLabel: "Enlace a esta sección",
        },
        [text("#")]
      ),
    ],
  }
}

function decorate(node: ElementContent): ElementContent {
  if (node.type !== "element") return node
  if (node.tagName === "pre") return codeFrame(node)
  if (node.tagName === "table")
    return tableFrame({ ...node, children: node.children.map(decorate) })
  if (ANCHORED_HEADINGS.has(node.tagName)) return withAnchor(node)
  if (isDrawnDiagram(node)) return diagramFrame(node)
  if (node.tagName === "img")
    return {
      ...node,
      properties: { ...node.properties, loading: "lazy", dataZoomable: true },
    }
  if (node.tagName === "a" && isExternal(node.properties.href)) {
    return {
      ...node,
      properties: {
        ...node.properties,
        target: "_blank",
        rel: ["noopener", "noreferrer"],
      },
      children: node.children.map(decorate),
    }
  }
  return { ...node, children: node.children.map(decorate) }
}

function decorateRoot(node: RootContent): RootContent {
  if (node.type === "element") return decorate(node)
  return node
}

/** A run of the page: a known section (`kind`) or the text between them. */
export interface PageBlock {
  kind: SectionKind | null
  html: string
}

/**
 * The section kind a top-level `##` opens: its kind, `null` for any other
 * `##`, and `undefined` for a node that is not a `##`.
 */
function opensSection(node: RootContent): SectionKind | null | undefined {
  if (node.type !== "element" || node.tagName !== "h2") return undefined
  return sectionKindOf(textOf(node))
}

/**
 * The HTML of a page tree, with the reader's frames and controls, in blocks:
 * each known section (its `##` heading and what follows, up to the next
 * `##`) apart, so the page wraps it, and the rest of the text between them.
 */
export function renderBlocks(tree: Root): PageBlock[] {
  const runs: { kind: SectionKind | null; nodes: RootContent[] }[] = []
  for (const node of tree.children) {
    const opened = opensSection(node)
    const current = runs.at(-1)
    // A known section always starts its own run; any other `##` ends one.
    const ends =
      opened === null && current !== undefined && current.kind !== null
    if (current === undefined || typeof opened === "string" || ends)
      runs.push({ kind: opened ?? null, nodes: [node] })
    else current.nodes.push(node)
  }
  return runs.map((run) => ({
    kind: run.kind,
    html: toHtml({ type: "root", children: run.nodes.map(decorateRoot) }),
  }))
}
