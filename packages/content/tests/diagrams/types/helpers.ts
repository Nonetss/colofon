import { sanitize } from "hast-util-sanitize"
import { toHtml } from "hast-util-to-html"
import type { Catalog } from "#catalog"
import { createMetaSchemas } from "#meta-schema"
import type { Diagram, DiagramContext } from "#pages/diagrams"
import { diagramFigure, readDiagram } from "#pages/diagrams"
import { SANITIZE_SCHEMA } from "#pages/to-hast"

// Reading and drawing a typed diagram in a test, without a content folder.

/** No catalog, and the pages "" and "red". */
export const NO_CONTENT: DiagramContext = {
  catalog: new Map(),
  pages: new Set(["", "red"]),
}

/** A catalog with the entity `maquinas/nas`, labelled "NAS". */
export function catalogWithNas(): Catalog {
  const definition = createMetaSchemas({
    typeIds: ["maquinas"],
    menuPaths: [],
  }).typeDefinition.parse({
    nombre: "Máquina",
    plural: "Máquinas",
    campos: { ip: { tipo: "ip" } },
  })
  const nas = {
    id: "nas",
    type: "maquinas",
    label: "NAS",
    page: null,
    values: {},
  }
  return new Map([
    [
      "maquinas",
      {
        id: "maquinas",
        definition,
        entities: new Map([["nas", nas]]),
        problems: [],
      },
    ],
  ])
}

/** Reads `spec` (a typed diagram, `title` and `desc` added) as a file. */
export function readTyped(
  spec: Record<string, unknown>,
  context: DiagramContext = NO_CONTENT
) {
  return readDiagram(
    "d",
    "diagramas/d.json",
    JSON.stringify({ title: "Título", desc: "Descripción", ...spec }),
    context
  )
}

/** The messages of the problems reading `spec` reports. */
export function problemsOf(
  spec: Record<string, unknown>,
  context: DiagramContext = NO_CONTENT
): string[] {
  return readTyped(spec, context).problems.map((problem) => problem.message)
}

/** The diagram `spec` reads as, failing the test when there is none. */
export function diagramOf(
  spec: Record<string, unknown>,
  context: DiagramContext = NO_CONTENT
): Diagram {
  const read = readTyped(spec, context)
  if (read.diagram === null)
    throw new Error(JSON.stringify(read.problems.map((p) => p.message)))
  return read.diagram
}

/** The diagram, failing the test on any problem. */
export function cleanDiagramOf(
  spec: Record<string, unknown>,
  context: DiagramContext = NO_CONTENT
): Diagram {
  const read = readTyped(spec, context)
  if (read.diagram === null || read.problems.length > 0)
    throw new Error(JSON.stringify(read.problems.map((p) => p.message)))
  return read.diagram
}

/** The figure's HTML after the page sanitizer, as a reader gets it. */
export function htmlOf(diagram: Diagram): string {
  const figure = diagramFigure(diagram, (pagePath) => `/casa/${pagePath}`)
  return toHtml(sanitize({ type: "root", children: [figure] }, SANITIZE_SCHEMA))
}

/** The figure's text version (`doc-diagram-text`) as HTML. */
export function textOf(diagram: Diagram): string {
  const html = htmlOf(diagram)
  const start = html.indexOf('<div class="doc-diagram-text">')
  if (start === -1) return ""
  return html.slice(start)
}

/** The box with id `id`, failing the test when there is none. */
export function boxOf(diagram: Diagram, id: string) {
  const box = diagram.nodes.find((node) => node.id === id)
  if (box === undefined) throw new Error(`No box ${id}`)
  return box
}
