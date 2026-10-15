import type { Dirent } from "node:fs"
import { readdir, readFile } from "node:fs/promises"
import path from "node:path"
import type { Element, ElementContent } from "hast"
import { z } from "zod"
import type { Catalog, Entity } from "#catalog"
import { enumOf } from "#enum-of"
import { iconName } from "#icon-name"
import { DIAGRAMS_DIR, describeIssue, parseYaml, spanishErrors } from "#load"
import { entityPath } from "#pages/catalog-paths"
import {
  createLayoutEngine,
  type DiagramLayout,
  type LayoutEngine,
  layoutDiagram,
} from "#pages/diagram-layout"
import { diagramSvg } from "#pages/diagram-svg"
import { entityPagePath } from "#pages/entities"
import type { PageProblem } from "#pages/types"

// The diagrams of a repository: one `diagramas/<id>.yaml` each, shown in any
// page with `<Diagram id="…" />`. A diagram is declared, not drawn: its nodes
// (an entity of the catalog, or a name), the connections between them and the
// zones that group them. Every problem is reported on the file with its field
// path, and whatever is valid is kept, so one bad node or connection never
// hides the rest. The platform lays each diagram out when it is read
// (`diagram-layout.ts`) and draws it as an SVG (`diagram-svg.ts`), keeping
// its zones and connections as text for screen readers and `llm.txt`.

const ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/

/** The keys a diagram file accepts. */
const DIAGRAM_KEYS = [
  "titulo",
  "descripcion",
  "direccion",
  "nodos",
  "conexiones",
  "zonas",
] as const

/** `derecha` lays the flow left to right; `abajo`, top to bottom. */
export const DIAGRAM_DIRECTIONS = ["derecha", "abajo"] as const

/** `entrada` where the flow starts; `almacen` for data. */
export const NODE_KINDS = ["entrada", "almacen"] as const

export type DiagramNode = {
  id: string
  name: string
  sub: string | null
  icon: string | null
  kind: (typeof NODE_KINDS)[number] | null
  /** The catalog entity it stands for, if any. */
  entity: Entity | null
}

export type DiagramConnection = {
  from: string
  to: string
  label: string | null
}

export type DiagramZone = { id: string; title: string; nodes: string[] }

export type Diagram = {
  id: string
  title: string
  description: string
  direction: (typeof DIAGRAM_DIRECTIONS)[number]
  nodes: ReadonlyMap<string, DiagramNode>
  connections: DiagramConnection[]
  zones: DiagramZone[]
  /** Where its boxes go, `null` until laid out or when the layout failed. */
  layout: DiagramLayout | null
}

/** A diagram file read: what could be kept of it, and what went wrong. */
export type DiagramFile = {
  id: string
  /** Path relative to the content root (`diagramas/red.yaml`). */
  file: string
  /** `null` when the file is not YAML or not a map. */
  diagram: Diagram | null
  problems: PageProblem[]
}

/**
 * Every diagram of the repository at `root`, by id, in id order, each laid
 * out by `engine` (ELK in this process unless a test passes another).
 */
export async function readDiagrams(
  root: string,
  catalog: Catalog,
  engine: LayoutEngine = createLayoutEngine()
): Promise<{ diagrams: Map<string, DiagramFile>; problems: PageProblem[] }> {
  const diagrams = new Map<string, DiagramFile>()
  const problems: PageProblem[] = []
  for (const entry of await listDir(path.join(root, DIAGRAMS_DIR))) {
    if (!entry.isFile()) continue
    const file = `${DIAGRAMS_DIR}/${entry.name}`
    if (entry.name.endsWith(".yml")) {
      problems.push({
        file,
        line: null,
        message: "La extensión es .yaml, no .yml",
      })
      continue
    }
    if (!entry.name.endsWith(".yaml")) continue
    const id = entry.name.slice(0, -".yaml".length)
    if (!ID_PATTERN.test(id)) {
      problems.push({
        file,
        line: null,
        message:
          "El nombre del fichero es el id del diagrama: en minúsculas, sin acentos y con guiones (red-de-casa)",
      })
      continue
    }
    const text = await readFile(path.join(root, file), "utf8")
    const read = await laidOut(readDiagram(id, file, text, catalog), engine)
    diagrams.set(id, read)
    problems.push(...read.problems)
  }
  return { diagrams, problems }
}

/** The diagram read with its layout; a failed layout is reported on its file. */
async function laidOut(
  read: DiagramFile,
  engine: LayoutEngine
): Promise<DiagramFile> {
  if (read.diagram === null) return read
  try {
    const layout = await layoutDiagram(read.diagram, engine)
    return { ...read, diagram: { ...read.diagram, layout } }
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    return {
      ...read,
      problems: [
        ...read.problems,
        {
          file: read.file,
          line: null,
          message: `No se pudo colocar el diagrama, se muestra como texto: ${reason}`,
        },
      ],
    }
  }
}

/** Reads one diagram file's text. */
export function readDiagram(
  id: string,
  file: string,
  text: string,
  catalog: Catalog
): DiagramFile {
  const problems: PageProblem[] = []
  const report = (at: string, message: string) =>
    problems.push({ file, line: null, message: withPath(at, message) })
  const yamlProblems: { file: string; message: string }[] = []
  const data = parseYaml(text, file, yamlProblems)
  for (const problem of yamlProblems)
    problems.push({ file, line: null, message: problem.message })
  if (data === undefined) return { id, file, diagram: null, problems }
  if (!isRecord(data)) {
    report("", "Un diagrama es un mapa con titulo, descripcion y nodos")
    return { id, file, diagram: null, problems }
  }

  for (const key of Object.keys(data)) {
    if (!isDiagramKey(key))
      report(
        "",
        `\`${key}\` no es una clave de un diagrama (${DIAGRAM_KEYS.join(", ")})`
      )
  }
  const title = requiredText(data.titulo, "titulo", report, id)
  const description = requiredText(data.descripcion, "descripcion", report, "")
  const direction = directionOf(data.direccion, report)
  const nodes = nodesOf(data.nodos, catalog, report)
  const connections = connectionsOf(data.conexiones, nodes, report)
  const zones = zonesOf(data.zonas, nodes, report)
  return {
    id,
    file,
    diagram: {
      id,
      title,
      description,
      direction,
      nodes,
      connections,
      zones,
      layout: null,
    },
    problems,
  }
}

type Report = (at: string, message: string) => void

function withPath(at: string, message: string): string {
  if (at === "") return message
  return `${at}: ${message}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isDiagramKey(key: string): boolean {
  return DIAGRAM_KEYS.some((known) => known === key)
}

function requiredText(
  value: unknown,
  key: string,
  report: Report,
  fallback: string
): string {
  if (typeof value === "string" && value.trim() !== "") return value
  if (value === undefined) report(key, "Falta: es obligatorio")
  else report(key, "Es un texto")
  return fallback
}

function directionOf(value: unknown, report: Report): Diagram["direction"] {
  if (value === undefined) return "derecha"
  const parsed = z.enum(DIAGRAM_DIRECTIONS).safeParse(value)
  if (parsed.success) return parsed.data
  report("direccion", `Es ${DIAGRAM_DIRECTIONS.join(" o ")}`)
  return "derecha"
}

const zoneSchema = z.strictObject({
  titulo: z.string().min(1).meta({ description: "El título de la zona" }),
  nodos: z
    .array(z.string().min(1))
    .min(1)
    .meta({ description: "Los ids de los nodos que agrupa" }),
})

/**
 * The schemas of a diagram file. With `entityKeys` (every `<type>/<id>` of
 * the catalog), `entidad` lists them for the editor; without them it is
 * checked against the catalog when the file is read.
 */
export function diagramSchemas(entityKeys?: readonly string[]) {
  const node = z.strictObject({
    entidad: entityRefSchema(entityKeys)
      .optional()
      .meta({ description: "La entidad del catálogo que es: <tipo>/<id>" }),
    nombre: z.string().min(1).optional().meta({
      description: "El nombre de la caja, si no es una entidad",
    }),
    sub: z.string().min(1).optional().meta({
      description: "Una línea corta bajo el nombre",
    }),
    icono: iconName.optional(),
    tipo: z.enum(NODE_KINDS).optional().meta({
      description: "entrada: donde empieza el flujo; almacen: datos",
    }),
  })
  const nodeId = z.string().regex(ID_PATTERN)
  const file = z.strictObject({
    titulo: z.string().min(1).meta({ description: "El título del diagrama" }),
    descripcion: z.string().min(1).meta({
      description: "Qué muestra, en una o dos frases: es su texto alternativo",
    }),
    direccion: z.enum(DIAGRAM_DIRECTIONS).optional().meta({
      description: "derecha (por defecto) o abajo: hacia dónde va el flujo",
    }),
    nodos: z.record(nodeId, z.union([z.string().min(1), node])).meta({
      description:
        "Las cajas por id: un nombre, o { entidad: <tipo>/<id> } o { nombre: … }",
    }),
    conexiones: z
      .array(
        z.union([
          z.string().min(1),
          z.record(z.string(), z.union([z.string(), z.null()])),
        ])
      )
      .optional()
      .meta({
        description: "Lista de `- origen -> destino: lo que viaja por ella`",
      }),
    zonas: z.record(nodeId, zoneSchema).optional().meta({
      description: "Grupos de nodos con título: dónde está cada cosa",
    }),
  })
  return { node, file }
}

function entityRefSchema(entityKeys: readonly string[] | undefined) {
  if (entityKeys === undefined)
    return z.string().regex(/^[a-z0-9-]+\/[a-z0-9-]+$/, {
      error: "Es <tipo>/<id> de una entidad del catálogo (machines/nas)",
    })
  return enumOf(entityKeys, "No hay ninguna entidad en catalogo/")
}

const nodeSchema = diagramSchemas().node

function nodesOf(
  value: unknown,
  catalog: Catalog,
  report: Report
): Map<string, DiagramNode> {
  const nodes = new Map<string, DiagramNode>()
  if (value === undefined) {
    report("nodos", "Falta: un diagrama tiene al menos un nodo")
    return nodes
  }
  if (!isRecord(value) || Object.keys(value).length === 0) {
    report("nodos", "Es un mapa de nodos por id, con al menos uno")
    return nodes
  }
  for (const [id, written] of Object.entries(value)) {
    const at = `nodos.${id}`
    if (!ID_PATTERN.test(id)) {
      report(at, "El id de un nodo va en minúsculas, sin acentos y con guiones")
      continue
    }
    nodes.set(id, nodeOf(id, written, at, catalog, report))
  }
  return nodes
}

function nodeOf(
  id: string,
  written: unknown,
  at: string,
  catalog: Catalog,
  report: Report
): DiagramNode {
  const plain: DiagramNode = {
    id,
    name: id,
    sub: null,
    icon: null,
    kind: null,
    entity: null,
  }
  if (typeof written === "string" && written.trim() !== "")
    return { ...plain, name: written }
  const parsed = nodeSchema.safeParse(written, { error: spanishErrors })
  if (!parsed.success) {
    for (const issue of parsed.error.issues) report(at, describeIssue(issue))
    return plain
  }
  const node = parsed.data
  const base: DiagramNode = {
    ...plain,
    sub: node.sub ?? null,
    icon: node.icono ?? null,
    kind: node.tipo ?? null,
  }
  if (node.entidad !== undefined && node.nombre !== undefined) {
    report(at, "Lleva `entidad` o `nombre`, no los dos")
    return { ...base, name: node.nombre }
  }
  if (node.nombre !== undefined) return { ...base, name: node.nombre }
  if (node.entidad === undefined) {
    report(at, "Lleva `entidad` (<tipo>/<id>) o `nombre`")
    return base
  }
  const [typeId = "", entityId = ""] = node.entidad.split("/")
  const type = catalog.get(typeId)
  const entity = type?.entities.get(entityId)
  if (type === undefined || entity === undefined) {
    report(
      `${at}.entidad`,
      `\`${node.entidad}\` no es ninguna entidad del catálogo`
    )
    return base
  }
  return {
    ...base,
    name: entity.label,
    icon: entityIcon(base.icon, type.definition.icono),
    entity,
  }
}

/** The node's own icon wins over its entity type's. */
function entityIcon(
  own: string | null,
  typeIcon: string | undefined
): string | null {
  if (own !== null) return own
  return typeIcon ?? null
}

const CONNECTION = /^\s*([^\s>-][^>]*?)\s*->\s*(\S.*?)\s*$/

function connectionsOf(
  value: unknown,
  nodes: ReadonlyMap<string, DiagramNode>,
  report: Report
): DiagramConnection[] {
  if (value === undefined) return []
  if (!Array.isArray(value)) {
    report("conexiones", "Es una lista de `- origen -> destino: etiqueta`")
    return []
  }
  const connections: DiagramConnection[] = []
  value.forEach((item, position) => {
    const at = `conexiones.${position}`
    const written = writtenConnection(item)
    if (written === null) {
      report(
        at,
        "Se escribe `origen -> destino` o `origen -> destino: etiqueta`"
      )
      return
    }
    const match = CONNECTION.exec(written.ends)
    if (match === null) {
      report(at, `\`${written.ends}\` no es \`origen -> destino\``)
      return
    }
    const [, from = "", to = ""] = match
    const missing = [from, to].filter((end) => !nodes.has(end))
    if (missing.length > 0) {
      report(
        at,
        `${missing.map((end) => `\`${end}\``).join(" y ")} no es ninguno de los nodos`
      )
      return
    }
    connections.push({ from, to, label: written.label })
  })
  return connections
}

/** `a -> b` as text, or `a -> b: label`, which YAML reads as a one-key map. */
function writtenConnection(
  item: unknown
): { ends: string; label: string | null } | null {
  if (typeof item === "string") return { ends: item, label: null }
  if (!isRecord(item)) return null
  const entries = Object.entries(item)
  const [only] = entries
  if (entries.length !== 1 || only === undefined) return null
  const [ends, label] = only
  if (label === null) return { ends, label: null }
  if (typeof label !== "string" && typeof label !== "number") return null
  return { ends, label: String(label) }
}

function zonesOf(
  value: unknown,
  nodes: ReadonlyMap<string, DiagramNode>,
  report: Report
): DiagramZone[] {
  if (value === undefined) return []
  if (!isRecord(value)) {
    report("zonas", "Es un mapa de zonas por id, cada una con titulo y nodos")
    return []
  }
  const zones: DiagramZone[] = []
  const zoneOfNode = new Map<string, string>()
  for (const [id, written] of Object.entries(value)) {
    const at = `zonas.${id}`
    const parsed = zoneSchema.safeParse(written, { error: spanishErrors })
    if (!parsed.success) {
      for (const issue of parsed.error.issues) report(at, describeIssue(issue))
      continue
    }
    const members: string[] = []
    for (const node of parsed.data.nodos) {
      if (!nodes.has(node)) {
        report(`${at}.nodos`, `\`${node}\` no es ninguno de los nodos`)
        continue
      }
      const earlier = zoneOfNode.get(node)
      if (earlier !== undefined) {
        report(
          `${at}.nodos`,
          `\`${node}\` ya está en la zona \`${earlier}\`: un nodo va en una zona como mucho`
        )
        continue
      }
      zoneOfNode.set(node, id)
      members.push(node)
    }
    zones.push({ id, title: parsed.data.titulo, nodes: members })
  }
  return zones
}

/** For each entity's page path, the ids of the diagrams it is a node of. */
export function diagramsByEntity(
  diagrams: ReadonlyMap<string, DiagramFile>
): Map<string, string[]> {
  const found = new Map<string, string[]>()
  for (const { diagram } of diagrams.values()) {
    if (diagram === null) continue
    const entities = new Set<string>()
    for (const node of diagram.nodes.values()) {
      if (node.entity !== null)
        entities.add(entityPath(node.entity.type, node.entity.id))
    }
    for (const entity of entities) {
      const list = found.get(entity)
      if (list === undefined) found.set(entity, [diagram.id])
      else list.push(diagram.id)
    }
  }
  return found
}

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
 * (its layout failed), the caption and the text are what shows.
 */
export function diagramFigure(
  diagram: Diagram,
  routeOf: (pagePath: string) => string
): Element {
  const hrefOf = (node: DiagramNode): string | null => {
    if (node.entity === null) return null
    return routeOf(entityPagePath(node.entity))
  }
  const name = (id: string): ElementContent[] => {
    const node = diagram.nodes.get(id)
    if (node === undefined) return [text(id)]
    const href = hrefOf(node)
    if (href === null) return [text(node.name)]
    return [element("a", { href }, [text(node.name)])]
  }
  const textVersion: ElementContent[] = []
  if (diagram.zones.length > 0) {
    textVersion.push(
      element(
        "ul",
        { className: ["doc-diagram-zones"] },
        diagram.zones.map((zone) =>
          element("li", {}, [
            text(`${zone.title}: `),
            ...joined(zone.nodes.map(name), ", "),
          ])
        )
      )
    )
  }
  if (diagram.connections.length > 0) {
    textVersion.push(
      element(
        "ul",
        { className: ["doc-diagram-connections"] },
        diagram.connections.map((connection) =>
          element("li", {}, [
            ...name(connection.from),
            text(" → "),
            ...name(connection.to),
            ...labelOf(connection.label),
          ])
        )
      )
    )
  }
  const caption = element("figcaption", {}, [
    element("strong", {}, [text(diagram.title)]),
    text(captionTail(diagram.description)),
  ])
  const properties = { className: ["doc-diagram"], dataDiagram: diagram.id }
  if (diagram.layout === null)
    return element("figure", properties, [caption, ...textVersion])
  return element("figure", { ...properties, dataDrawn: "" }, [
    caption,
    element("div", { className: ["doc-diagram-canvas"] }, [
      diagramSvg(diagram, diagram.layout, hrefOf),
    ]),
    element("div", { className: ["doc-diagram-text"] }, textVersion),
  ])
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

async function listDir(dir: string): Promise<Dirent[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true })
    return entries.sort((a, b) => a.name.localeCompare(b.name))
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT")
      return []
    throw error
  }
}
