import type { Element, ElementContent } from "hast"
import type { Diagram, DiagramBox } from "#diagrams/model"
import { badgesOf, boxOf } from "#diagrams/svg/boxes"
import { edgeLabel, edgeLine, endsOf, hitOf } from "#diagrams/svg/edges"
import { cls, element, n, P, rect, text } from "#diagrams/svg/elements"
import { graphicOf } from "#diagrams/svg/graphics"
import { legendOf } from "#diagrams/svg/legend"
import { zoneFrame, zoneTitle } from "#diagrams/svg/zones"

// A diagram drawn as an inline SVG with the look of the reference site's
// scheme drawer (`lib.mjs`): tagged boxes, right-angle arrows with a label
// over them, one accent piece, hued zones, badges and a legend strip under
// the drawing. It is hast, so it goes through the same sanitizer as every
// page: no ids, styles or markers (arrowheads are their own paths), and the
// colours and fonts come from the reader's CSS on the `doc-diagram-*`
// classes, so the drawing follows the theme. The `data-*` attributes are
// what the reader's highlighting reads. Content text only ever lands in
// text nodes and attribute values.

/** The drawings this wide or wider keep 640px on narrow screens. */
const WIDE = 640

/** The drawing of `diagram`, `size` wide and high plus its legend. */
export function diagramSvg(
  diagram: Diagram,
  size: { width: number; height: number },
  routeOf: (pagePath: string) => string
): Element {
  if (diagram.illustration !== null)
    return illustrationSvg(diagram, diagram.illustration, size)
  const byId = new Map<string, DiagramBox>()
  for (const box of diagram.nodes) if (box.id !== null) byId.set(box.id, box)
  const legend = legendOf(diagram, size)
  const parts: ElementContent[] = [
    element("title", {}, [text(diagram.title)]),
    rect(cls("paper"), 0, 0, size.width, legend.height, 0),
  ]
  for (const graphic of diagram.under) parts.push(graphicOf(graphic, routeOf))
  const titles: Element[] = []
  for (const zone of diagram.zones) {
    parts.push(zoneFrame(zone))
    titles.push(zoneTitle(zone))
  }
  const lines: Element[] = []
  const hits: Element[] = []
  const labels: Element[] = []
  for (const edge of diagram.edges) {
    if (edge.points === null) continue
    lines.push(...edgeLine(edge, edge.points))
    const ends = endsOf(edge)
    if (ends !== null) hits.push(hitOf(edge, edge.points, ends))
    if (edge.label !== null && edge.at !== null)
      labels.push(edgeLabel(edge, edge.label, edge.at, ends))
  }
  parts.push(...lines, ...hits, ...titles, ...labels)
  for (const note of diagram.notes)
    parts.push(
      element(
        "text",
        {
          className: cls("note"),
          x: n(note.x),
          y: n(note.y),
          textAnchor: note.anchor,
        },
        [text(note.text)]
      )
    )
  for (const box of diagram.nodes) parts.push(boxOf(box, routeOf))
  for (const box of diagram.nodes)
    parts.push(...badgesOf(box, diagram.edges, byId))
  for (const graphic of diagram.over) parts.push(graphicOf(graphic, routeOf))
  parts.push(...legend.parts)
  const className = [`${P}svg`]
  if (size.width >= WIDE) className.push(`${P}svg-wide`)
  return element(
    "svg",
    {
      className,
      viewBox: `0 0 ${n(size.width)} ${n(legend.height)}`,
      width: n(size.width),
      role: "img",
      ariaLabel: altText(diagram),
    },
    parts
  )
}

/** A hand-drawn diagram: its own drawing, sized and labelled as any other. */
function illustrationSvg(
  diagram: Diagram,
  illustration: { viewBox: string; children: ElementContent[] },
  size: { width: number; height: number }
): Element {
  const className = [`${P}svg`, `${P}illustration`]
  if (size.width >= WIDE) className.push(`${P}svg-wide`)
  return element(
    "svg",
    {
      className,
      viewBox: illustration.viewBox,
      width: n(size.width),
      role: "img",
      ariaLabel: altText(diagram),
    },
    [element("title", {}, [text(diagram.title)]), ...illustration.children]
  )
}

function altText(diagram: Diagram): string {
  if (diagram.description === "") return diagram.title
  return `${diagram.title}. ${diagram.description}`
}
