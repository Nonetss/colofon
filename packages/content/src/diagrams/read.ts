import type { Dirent } from "node:fs"
import { readdir, readFile } from "node:fs/promises"
import path from "node:path"
import { entityPath } from "#contract/catalog-paths"
import { DIAGRAMS_DIR, parseJson } from "#contract/load"
import type { PageProblem } from "#contract/problems"
import { drawnDiagram } from "#diagrams/drawn"
import { readIllustration } from "#diagrams/illustration"
import type { Diagram, DiagramContext, DiagramFile } from "#diagrams/model"
import {
  isRecord,
  type Report,
  requiredText,
  unknownKeys,
  withPath,
} from "#diagrams/report"
import { ID_PATTERN } from "#diagrams/schema"
import { typeModule, typeNames } from "#diagrams/types/index"
import { checkAccents } from "#diagrams/types/kit/budget"
import { FORM_KEYS } from "#diagrams/types/kit/form"
import type { Scene, Tools } from "#diagrams/types/kit/scene"

// The diagrams of a repository: one `diagramas/<id>.json` each, shown in any
// page with `<Diagram id="…" />`. A file without `type` is in the format of
// the reference site's scheme drawer (`lib.mjs`, see `schema.ts`), where the
// content places every box, arrow and zone (`drawn.ts`). A file with `type`
// is one of the typed forms (`types/`), which the platform lays out from
// data. Every problem is reported on the file with its field path
// (`nodes.3.entity`) and whatever is valid is kept, so one bad box or arrow
// never hides the rest. `figure.ts` turns a read diagram into the page's
// figure.

const EXTENSION = ".json"
const ILLUSTRATION = ".svg"

/**
 * Every diagram of the repository at `root`, by id, in id order: its JSON
 * file, or else its hand-drawn `.svg`.
 */
export async function readDiagrams(
  root: string,
  context: DiagramContext
): Promise<{ diagrams: Map<string, DiagramFile>; problems: PageProblem[] }> {
  const diagrams = new Map<string, DiagramFile>()
  const problems: PageProblem[] = []
  const illustrations: { id: string; file: string; text: string }[] = []
  for (const entry of await listDir(path.join(root, DIAGRAMS_DIR))) {
    if (!entry.isFile()) continue
    const file = `${DIAGRAMS_DIR}/${entry.name}`
    const yaml = /\.ya?ml$/.exec(entry.name)
    if (yaml !== null) {
      const id = entry.name.slice(0, yaml.index)
      problems.push({
        file,
        line: null,
        message: `Los diagramas se escriben ahora en JSON: pásalo a ${DIAGRAMS_DIR}/${id}${EXTENSION}`,
      })
      continue
    }
    const extension = extensionOf(entry.name)
    if (extension === null) continue
    const id = entry.name.slice(0, -extension.length)
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
    if (extension === ILLUSTRATION) {
      illustrations.push({ id, file, text })
      continue
    }
    const read = readDiagram(id, file, text, context)
    diagrams.set(id, read)
    problems.push(...read.problems)
  }
  for (const { id, file, text } of illustrations) {
    if (diagrams.has(id)) {
      problems.push({
        file,
        line: null,
        message: `${DIAGRAMS_DIR}/${id}${EXTENSION} ya es el diagrama ${id}: este fichero no se usa`,
      })
      continue
    }
    const read = illustrationFile(id, file, text)
    diagrams.set(id, read)
    problems.push(...read.problems)
  }
  return { diagrams, problems }
}

function extensionOf(name: string): string | null {
  if (name.endsWith(EXTENSION)) return EXTENSION
  if (name.endsWith(ILLUSTRATION)) return ILLUSTRATION
  return null
}

/** Reads a hand-drawn `.svg` diagram. */
export function illustrationFile(
  id: string,
  file: string,
  text: string
): DiagramFile {
  const problems: PageProblem[] = []
  const read = readIllustration(text, (message) =>
    problems.push({ file, line: null, message })
  )
  if (read === null) return { id, file, diagram: null, problems }
  return {
    id,
    file,
    diagram: {
      id,
      title: read.title,
      description: read.description,
      size: { width: read.width, height: read.height },
      nodes: [],
      edges: [],
      zones: [],
      notes: [],
      kindNames: {},
      edgeNames: {},
      badgeName: null,
      shapes: {},
      type: null,
      under: [],
      over: [],
      legend: [],
      text: [],
      entities: [],
      illustration: { viewBox: read.viewBox, children: read.children },
    },
    problems,
  }
}

/** Reads one diagram file's text. */
export function readDiagram(
  id: string,
  file: string,
  text: string,
  context: DiagramContext
): DiagramFile {
  const problems: PageProblem[] = []
  const report: Report = (at, message) =>
    problems.push({ file, line: null, message: withPath(at, message) })
  const jsonProblems: { file: string; message: string }[] = []
  const data = parseJson(text, file, jsonProblems)
  for (const problem of jsonProblems)
    problems.push({ file, line: null, message: problem.message })
  if (data === undefined) return { id, file, diagram: null, problems }
  if (!isRecord(data)) {
    report("", "Un diagrama es un objeto con title, desc y nodes (o items)")
    return { id, file, diagram: null, problems }
  }
  if (data.type !== undefined)
    return {
      id,
      file,
      diagram: typedDiagram(id, data, context, report),
      problems,
    }

  return {
    id,
    file,
    diagram: drawnDiagram(id, data, context, report),
    problems,
  }
}

/**
 * A typed diagram: its form checks its keys and lays it out. An unknown
 * `type` or `variant` is reported; nothing is drawn for an unknown type.
 */
function typedDiagram(
  id: string,
  data: Record<string, unknown>,
  context: DiagramContext,
  report: Report
): Diagram | null {
  const name = data.type
  const form = typeof name === "string" ? typeModule(name) : undefined
  if (form === undefined) {
    report(
      "type",
      `\`${String(name)}\` no es ningún tipo de diagrama (${typeNames().join(", ")})`
    )
    return null
  }
  unknownKeys(
    data,
    [...FORM_KEYS, ...form.keys],
    form.label.toLowerCase(),
    report
  )
  const title = requiredText(data.title, "title", report, id)
  const description = requiredText(data.desc, "desc", report, "")
  const variant = variantOf(data.variant, form.variants, report)
  const tools: Tools = { report, context, ids: new Set(), entities: [] }
  const scene = form.read(data, tools, variant)
  if (scene === null) return null
  checkAccents(scene.accents, report)
  return sceneDiagram(id, title, description, form.name, scene, tools)
}

function variantOf(
  value: unknown,
  variants: readonly string[],
  report: Report
): string | null {
  if (value === undefined) return null
  if (typeof value === "string" && variants.includes(value)) return value
  if (variants.length === 0) {
    report("variant", "Este tipo de diagrama no tiene variantes")
    return null
  }
  report(
    "variant",
    `\`${String(value)}\` no es ninguna variante de este tipo (${variants.join(", ")})`
  )
  return null
}

function sceneDiagram(
  id: string,
  title: string,
  description: string,
  type: string,
  scene: Scene,
  tools: Tools
): Diagram {
  const entities = [...tools.entities]
  for (const node of scene.nodes)
    if (node.entity !== null && !entities.includes(node.entity))
      entities.push(node.entity)
  return {
    id,
    title,
    description,
    size: scene.size,
    nodes: scene.nodes,
    edges: scene.edges,
    zones: scene.zones,
    notes: scene.notes,
    kindNames: {},
    edgeNames: {},
    badgeName: null,
    shapes: {},
    type,
    under: scene.under,
    over: scene.over,
    legend: scene.legend,
    text: scene.text,
    entities,
    illustration: null,
  }
}

/** For each entity's page path, the ids of the diagrams it is a box of. */
export function diagramsByEntity(
  diagrams: ReadonlyMap<string, DiagramFile>
): Map<string, string[]> {
  const found = new Map<string, string[]>()
  for (const { diagram } of diagrams.values()) {
    if (diagram === null) continue
    const entities = new Set<string>()
    for (const entity of diagram.entities)
      entities.add(entityPath(entity.type, entity.id))
    for (const entity of entities) {
      const list = found.get(entity)
      if (list === undefined) found.set(entity, [diagram.id])
      else list.push(diagram.id)
    }
  }
  return found
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
