import type { Element, ElementContent } from "hast"
import type {
  Diagram,
  DiagramBox,
  DiagramEdge,
  TextBlock,
  TextPart,
  TextTree,
} from "#diagrams/model"
import { diagramSvg } from "#diagrams/svg"

// A read diagram as the page's figure: its drawing (`svg.ts`), its caption,
// and its text version kept for screen readers and `llm.txt`.

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

/**
 * A diagram as a figure. Drawn, only the drawing shows: its caption and its
 * zones and connections as text stay in the tree, hidden from sight, for
 * screen readers and for the page's Markdown (`llm.txt`). Without a drawing
 * (no valid size), the caption and the text are what shows.
 */
export function diagramFigure(
  diagram: Diagram,
  routeOf: (pagePath: string) => string
): Element {
  const byId = new Map<string, DiagramBox>()
  for (const node of diagram.nodes)
    if (node.id !== null) byId.set(node.id, node)
  const name = (id: string): ElementContent[] => {
    const node = byId.get(id)
    if (node === undefined) return [text(id)]
    if (node.link === null) return [text(node.name)]
    return [element("a", { href: routeOf(node.link) }, [text(node.name)])]
  }
  const zoneLabel = (id: string): ElementContent[] => {
    const zone = diagram.zones.find((declared) => declared.id === id)
    if (zone === undefined) return [text(id)]
    return [text(zone.label)]
  }
  const textVersion = textVersionOf(diagram, name, zoneLabel)
  const caption = element("figcaption", {}, [
    element("strong", {}, [text(diagram.title)]),
    text(captionTail(diagram.description)),
  ])
  const properties = { className: ["doc-diagram"], dataDiagram: diagram.id }
  if (diagram.size === null)
    return element("figure", properties, [caption, ...textVersion])
  return element("figure", { ...properties, dataDrawn: "" }, [
    caption,
    element("div", { className: ["doc-diagram-canvas"] }, [
      diagramSvg(diagram, diagram.size, routeOf),
    ]),
    element("div", { className: ["doc-diagram-text"] }, textVersion),
  ])
}

/** A typed form's text version, or a drawn diagram's zones and arrows. */
function textVersionOf(
  diagram: Diagram,
  name: (id: string) => ElementContent[],
  zoneLabel: (id: string) => ElementContent[]
): ElementContent[] {
  if (diagram.text !== null) return typedText(diagram.text, name)
  const textVersion: ElementContent[] = []
  const zones = diagram.zones
    .filter((zone) => zone.id !== null)
    .map((zone) => ({
      zone,
      members: diagram.nodes.filter(
        (node) => node.id !== null && node.zone === zone.id
      ),
    }))
    .filter(({ members }) => members.length > 0)
  if (zones.length > 0) {
    textVersion.push(
      element(
        "ul",
        { className: ["doc-diagram-zones"] },
        zones.map(({ zone, members }) =>
          element("li", {}, [
            text(`${zone.label}: `),
            ...joined(
              members.map((node) => name(node.id ?? "")),
              ", "
            ),
          ])
        )
      )
    )
  }
  const connections = diagram.edges.filter(
    (edge) => edge.from !== null && (edge.to !== null || edge.toZone !== null)
  )
  if (connections.length > 0) {
    textVersion.push(
      element(
        "ul",
        { className: ["doc-diagram-connections"] },
        connections.map((edge) =>
          element("li", {}, [
            ...name(edge.from ?? ""),
            text(" → "),
            ...connectionEnd(edge, name, zoneLabel),
            ...labelOf(connectionLabel(edge)),
          ])
        )
      )
    )
  }
  return textVersion
}

/** The blocks of a typed form's text version, as lists and tables. */
function typedText(
  blocks: readonly TextBlock[],
  name: (id: string) => ElementContent[]
): ElementContent[] {
  const line = (parts: readonly TextPart[]): ElementContent[] => {
    const content: ElementContent[] = []
    for (const part of parts) {
      if (typeof part === "string") content.push(text(part))
      else content.push(...name(part.box))
    }
    return content
  }
  const tree = (items: readonly TextTree[]): Element =>
    element(
      "ul",
      {},
      items.map((item) => {
        if (item.children.length === 0)
          return element("li", {}, line(item.line))
        return element("li", {}, [...line(item.line), tree(item.children)])
      })
    )
  return blocks.map((block) => {
    if (block.kind === "tree") return tree(block.items)
    if (block.kind === "list")
      return element(
        listTag(block.ordered),
        {},
        block.items.map((item) => element("li", {}, line(item)))
      )
    return element("table", {}, [
      element("thead", {}, [
        element(
          "tr",
          {},
          block.head.map((cell) => element("th", {}, [text(cell)]))
        ),
      ]),
      element(
        "tbody",
        {},
        block.rows.map((row) =>
          element(
            "tr",
            {},
            row.map((cell) => element("td", {}, [text(cell)]))
          )
        )
      ),
    ])
  })
}

function listTag(ordered: boolean): string {
  if (ordered) return "ol"
  return "ul"
}

function connectionEnd(
  edge: DiagramEdge,
  name: (id: string) => ElementContent[],
  zoneLabel: (id: string) => ElementContent[]
): ElementContent[] {
  if (edge.to !== null) return name(edge.to)
  return zoneLabel(edge.toZone ?? "")
}

function connectionLabel(edge: DiagramEdge): string | null {
  if (edge.label !== null) return edge.label
  return edge.badge
}

function captionTail(description: string): string {
  if (description === "") return ""
  return `. ${description}`
}

function labelOf(label: string | null): ElementContent[] {
  if (label === null) return []
  return [text(`: ${label}`)]
}

function joined(
  parts: readonly ElementContent[][],
  separator: string
): ElementContent[] {
  const result: ElementContent[] = []
  for (const part of parts) {
    if (result.length > 0) result.push(text(separator))
    result.push(...part)
  }
  return result
}
