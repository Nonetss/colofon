import { isNode, parseDocument } from "yaml"
import { type ZodType, z } from "zod"
import type { PageProblem } from "#contract/read/problems"
import { isRecord } from "#contract/read/records"
import { yamlErrorReason } from "#contract/read/yaml"
import { type CatalogIndex, objectShape } from "#contract/schema/entity-schema"
import { iconName } from "#contract/schema/icon-name"
import {
  PAGE_HEADER_FIELDS,
  type SiteConfig,
} from "#contract/schema/meta-schema"
import type { ContractVersion } from "#contract/versions/detect"
import { foreignKeyMessage } from "#contract/versions/reading"
import { contractKey, pathFor, translateV1 } from "#contract/versions/v1"
import type { PageHeader } from "#pages/types"

// The header of a page: its YAML front matter, checked against the fields
// every page has plus the site's own `header` fields. A broken header never
// hides the page: every field that is valid on its own is kept, and the title
// falls back to the file name. A version 1 repository's headers are
// translated to the version 2 names first, and their problems name the keys
// the page holds.

const spanishErrors = z.locales.es().localeError

const DATE_ERROR = "Una fecha AAAA-MM-DD (2026-10-15)"

/** The checks of one header, built once per repository. */
export type HeaderSchema = {
  whole: ZodType
  fields: ReadonlyMap<string, ZodType>
  /** Names of the site's own fields, kept apart in `fields`. */
  extra: ReadonlySet<string>
  contract: ContractVersion
}

export function headerSchema(
  config: SiteConfig,
  index: CatalogIndex,
  contract: ContractVersion
): HeaderSchema {
  const extraShape = objectShape(config.header ?? {}, index)
  const shape: Record<string, ZodType> = {
    title: z.string().min(1),
    description: z.string().min(1),
    icon: iconName.optional(),
    order: z.number().optional(),
    updated: z.iso.date({ error: DATE_ERROR }).optional(),
    ...extraShape,
  }
  return {
    whole: z.strictObject(shape),
    fields: new Map(Object.entries(shape)),
    extra: new Set(Object.keys(extraShape)),
    contract,
  }
}

/** Front matter text of a page, `undefined` when the page has none. */
export type HeaderSource = { text: string; startLine: number } | undefined

/**
 * Reads a page header. `fallbackTitle` (the file name) is used when
 * `title` is missing or invalid. Problem lines count from the file's start.
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
  const value = asContract2Header(data.value, schema.contract, (at) =>
    problems.push({
      file,
      line: lineOf(data.document, at),
      message: foreignKeyMessage(at),
    })
  )
  const result = schema.whole.safeParse(value, { error: spanishErrors })
  if (!result.success) {
    for (const issue of result.error.issues) {
      const at = pathFor(schema.contract, "pageHeader", issuePath(issue))
      problems.push({
        file,
        line: lineOf(data.document, at),
        message: describeIssue(issue, schema.contract),
      })
    }
  }
  return { header: salvage(value, schema, fallbackTitle), problems }
}

/**
 * A header under the version 2 names; for a version 1 repository, each
 * version 2 key it holds goes to `foreign` and is left out.
 */
function asContract2Header(
  value: Record<string, unknown>,
  contract: ContractVersion,
  foreign: (at: PropertyKey[]) => void
): Record<string, unknown> {
  if (contract === "2") return value
  const translated = translateV1("pageHeader", value)
  for (const at of translated.foreign) foreign(at)
  if (!isRecord(translated.data)) return {}
  return translated.data
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

function describeIssue(
  issue: z.core.$ZodIssue,
  contract: ContractVersion
): string {
  if (issue.code === "unrecognized_keys") {
    const keys = issue.keys.map((key) => `\`${key}\``).join(", ")
    const fixed = PAGE_HEADER_FIELDS.map((key) => contractKey(contract, key))
    return `La cabecera no admite ${keys}: solo ${fixed.join(", ")} y los campos de cabecera de doc.config.yaml`
  }
  if (issue.path.length === 0) return issue.message
  const at = pathFor(contract, "pageHeader", issue.path)
  return `${at.join(".")}: ${issue.message}`
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
  const fields: Record<string, unknown> = {}
  for (const name of schema.extra) {
    if (valid.has(name)) fields[name] = valid.get(name)
  }
  return {
    title: textOr(valid.get("title"), fallbackTitle),
    description: textOr(valid.get("description"), ""),
    icon: textOrNull(valid.get("icon")),
    order: numberOrNull(valid.get("order")),
    updated: textOrNull(valid.get("updated")),
    editado: null,
    fields,
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
