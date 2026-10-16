import { isNode, parseDocument } from "yaml"
import { type ZodType, z } from "zod"
import { type CatalogIndex, objectShape } from "#contract/entity-schema"
import { iconName } from "#contract/icon-name"
import { yamlErrorReason } from "#contract/load"
import type { SiteConfig } from "#contract/meta-schema"
import type { PageProblem } from "#contract/problems"
import type { PageHeader } from "#pages/types"

// The header of a page: its YAML front matter, checked against the fields
// every page has plus the site's own `cabecera`. A broken header never hides
// the page: every field that is valid on its own is kept, and the title falls
// back to the file name.

const spanishErrors = z.locales.es().localeError

const DATE_ERROR = "Una fecha AAAA-MM-DD (2026-10-15)"

/** The checks of one header, built once per repository. */
export type HeaderSchema = {
  whole: ZodType
  fields: ReadonlyMap<string, ZodType>
  /** Names of the site's own fields, kept apart in `campos`. */
  extra: ReadonlySet<string>
}

export function headerSchema(
  config: SiteConfig,
  index: CatalogIndex
): HeaderSchema {
  const extraShape = objectShape(config.cabecera ?? {}, index)
  const shape: Record<string, ZodType> = {
    titulo: z.string().min(1),
    descripcion: z.string().min(1),
    icono: iconName.optional(),
    orden: z.number().optional(),
    actualizado: z.iso.date({ error: DATE_ERROR }).optional(),
    ...extraShape,
  }
  return {
    whole: z.strictObject(shape),
    fields: new Map(Object.entries(shape)),
    extra: new Set(Object.keys(extraShape)),
  }
}

/** Front matter text of a page, `undefined` when the page has none. */
export type HeaderSource = { text: string; startLine: number } | undefined

/**
 * Reads a page header. `fallbackTitle` (the file name) is used when
 * `titulo` is missing or invalid. Problem lines count from the file's start.
 */
export function readHeader(
  source: HeaderSource,
  schema: HeaderSchema,
  file: string,
  fallbackTitle: string
): { header: PageHeader; problems: PageProblem[] } {
  const problems: PageProblem[] = []
  const data = parseHeaderYaml(source, file, problems)
  // A header that isn't YAML has one problem; its missing fields aren't more.
  if (problems.length > 0)
    return { header: salvage({}, schema, fallbackTitle), problems }
  const lineOf = lineFinder(source)
  const result = schema.whole.safeParse(data.value, { error: spanishErrors })
  if (!result.success) {
    for (const issue of result.error.issues) {
      problems.push({
        file,
        line: lineOf(data.document, issuePath(issue)),
        message: describeIssue(issue),
      })
    }
  }
  return { header: salvage(data.value, schema, fallbackTitle), problems }
}

type ParsedHeader = {
  value: Record<string, unknown>
  document: ReturnType<typeof parseDocument> | undefined
}

function parseHeaderYaml(
  source: HeaderSource,
  file: string,
  problems: PageProblem[]
): ParsedHeader {
  if (source === undefined) return { value: {}, document: undefined }
  const document = parseDocument(source.text)
  const [error] = document.errors
  if (error !== undefined) {
    const position = error.linePos?.[0]
    problems.push({
      file,
      line: lineFromStart(source, position?.line),
      message: `La cabecera no es YAML válido: ${yamlErrorReason(error)}`,
    })
    return { value: {}, document: undefined }
  }
  const value: unknown = document.toJS()
  if (!isRecord(value)) return { value: {}, document }
  return { value, document }
}

function lineFromStart(
  source: HeaderSource,
  line: number | undefined
): number | null {
  if (source === undefined || line === undefined) return null
  return source.startLine + line - 1
}

function lineFinder(source: HeaderSource) {
  return (
    document: ParsedHeader["document"],
    path: readonly PropertyKey[]
  ): number | null => {
    if (source === undefined || document === undefined) return null
    const node = document.getIn(path, true)
    if (!isNode(node) || node.range === null || node.range === undefined)
      return null
    const before = source.text.slice(0, node.range[0])
    return source.startLine + before.split("\n").length - 1
  }
}

/** Where an issue points; an unknown key points at the first such key. */
function issuePath(issue: z.core.$ZodIssue): PropertyKey[] {
  if (issue.code !== "unrecognized_keys") return issue.path
  const [first] = issue.keys
  if (first === undefined) return issue.path
  return [...issue.path, first]
}

function describeIssue(issue: z.core.$ZodIssue): string {
  if (issue.code === "unrecognized_keys") {
    const keys = issue.keys.map((key) => `\`${key}\``).join(", ")
    return `La cabecera no admite ${keys}: solo titulo, descripcion, icono, orden, actualizado y los campos de cabecera de doc.config.yaml`
  }
  if (issue.path.length === 0) return issue.message
  return `${issue.path.join(".")}: ${issue.message}`
}

function salvage(
  data: Record<string, unknown>,
  schema: HeaderSchema,
  fallbackTitle: string
): PageHeader {
  const valid = new Map<string, unknown>()
  for (const [name, fieldSchema] of schema.fields) {
    if (!(name in data)) continue
    const parsed = fieldSchema.safeParse(data[name])
    if (parsed.success && parsed.data !== undefined)
      valid.set(name, parsed.data)
  }
  const campos: Record<string, unknown> = {}
  for (const name of schema.extra) {
    if (valid.has(name)) campos[name] = valid.get(name)
  }
  return {
    titulo: textOr(valid.get("titulo"), fallbackTitle),
    descripcion: textOr(valid.get("descripcion"), ""),
    icono: textOrNull(valid.get("icono")),
    orden: numberOrNull(valid.get("orden")),
    actualizado: textOrNull(valid.get("actualizado")),
    editado: null,
    campos,
  }
}

function textOr(value: unknown, fallback: string): string {
  if (typeof value === "string") return value
  return fallback
}

function textOrNull(value: unknown): string | null {
  if (typeof value === "string") return value
  return null
}

function numberOrNull(value: unknown): number | null {
  if (typeof value === "number") return value
  return null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
