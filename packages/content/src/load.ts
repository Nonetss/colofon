import type { Dirent } from "node:fs"
import { readdir, readFile } from "node:fs/promises"
import path from "node:path"
import { parse, YAMLParseError } from "yaml"
import { type ZodType, z } from "zod"
import type { CatalogIndex } from "#entity-schema"
import {
  createMetaSchemas,
  type FieldDefinition,
  type SiteConfig,
  type TypeDefinition,
} from "#meta-schema"

// Reads the declarations of a content repository: doc.config.yaml, each
// catalog type and the ids and pages its fields can point at. Entity files
// are listed, not read: their contents are the validator's job.

export const CONFIG_FILE = "doc.config.yaml"
export const CATALOG_DIR = "catalogo"
export const DOCS_DIR = "docs"
export const TYPE_FILE = "_tipo.yaml"

/** A problem in one file, with a path relative to the content root. */
export type ContentProblem = { file: string; message: string }

export type ContentDeclarations = {
  config: SiteConfig
  /** Each catalog type by id (its folder name), sorted by id. */
  types: ReadonlyMap<string, TypeDefinition>
  index: CatalogIndex
}

export type LoadResult =
  | { ok: true; content: ContentDeclarations }
  | { ok: false; problems: ContentProblem[] }

const ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/

const spanishErrors = z.locales.es().localeError

/** Loads the declarations of the content repository at `root`. */
export async function loadContent(root: string): Promise<LoadResult> {
  const problems: ContentProblem[] = []
  const meta = createMetaSchemas()

  const config = await readDeclaration(
    root,
    CONFIG_FILE,
    meta.siteConfig,
    problems
  )

  // A type exists when its folder does, even if its _tipo.yaml is broken:
  // refs to it are not reported again on top of that file's own problem.
  const typeIds = await catalogTypeIds(root, problems)
  const types = new Map<string, TypeDefinition>()
  const entityIds = new Map<string, string[]>()
  for (const typeId of typeIds) {
    const file = `${CATALOG_DIR}/${typeId}/${TYPE_FILE}`
    const type = await readDeclaration(
      root,
      file,
      meta.typeDefinition,
      problems
    )
    if (type !== undefined) types.set(typeId, type)
    entityIds.set(typeId, await entityIdsOf(root, typeId, problems))
  }

  if (config?.cabecera !== undefined) {
    checkRefs(config.cabecera, CONFIG_FILE, typeIds, problems)
  }
  for (const [typeId, type] of types) {
    const file = `${CATALOG_DIR}/${typeId}/${TYPE_FILE}`
    checkRefs(type.campos, file, typeIds, problems)
  }

  if (config === undefined || problems.length > 0)
    return { ok: false, problems }
  const pagePaths = await docPagePaths(root)
  return {
    ok: true,
    content: { config, types, index: { entityIds, pagePaths } },
  }
}

async function readDeclaration<T>(
  root: string,
  file: string,
  schema: ZodType<T>,
  problems: ContentProblem[]
): Promise<T | undefined> {
  const text = await readText(path.join(root, file))
  if (text === undefined) {
    problems.push({ file, message: "No existe" })
    return undefined
  }
  const data = parseYaml(text, file, problems)
  if (data === undefined) return undefined
  const result = schema.safeParse(data, { error: spanishErrors })
  if (result.success) return result.data
  for (const issue of result.error.issues) {
    problems.push({ file, message: describeIssue(issue) })
  }
  return undefined
}

function describeIssue(issue: z.core.$ZodIssue): string {
  if (issue.path.length === 0) return issue.message
  return `${issue.path.join(".")}: ${issue.message}`
}

async function readText(file: string): Promise<string | undefined> {
  try {
    return await readFile(file, "utf8")
  } catch (error) {
    if (isMissingFile(error)) return undefined
    throw error
  }
}

function isMissingFile(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT"
}

function parseYaml(
  text: string,
  file: string,
  problems: ContentProblem[]
): unknown {
  try {
    const data: unknown = parse(text)
    if (data === null) {
      problems.push({ file, message: "Está vacío" })
      return undefined
    }
    return data
  } catch (error) {
    if (!(error instanceof YAMLParseError)) throw error
    problems.push({ file, message: yamlErrorMessage(error) })
    return undefined
  }
}

function yamlErrorMessage(error: YAMLParseError): string {
  const position = error.linePos?.[0]
  const reason = yamlErrorReason(error)
  if (position === undefined) return `YAML no válido: ${reason}`
  return `YAML no válido en la línea ${position.line}, columna ${position.col}: ${reason}`
}

function yamlErrorReason(error: YAMLParseError): string {
  if (error.code === "BLOCK_AS_IMPLICIT_KEY") {
    return 'un texto con ": " dentro tiene que ir entre comillas'
  }
  const [firstLine = ""] = error.message.split("\n")
  return firstLine.replace(/ at line \d+, column \d+:?$/, "")
}

/** The entries of `dir` sorted by name, or none if it does not exist. */
async function listDir(dir: string): Promise<Dirent[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true })
    return entries.sort((a, b) => a.name.localeCompare(b.name))
  } catch (error) {
    if (isMissingFile(error)) return []
    throw error
  }
}

async function catalogTypeIds(
  root: string,
  problems: ContentProblem[]
): Promise<string[]> {
  const entries = await listDir(path.join(root, CATALOG_DIR))
  const ids: string[] = []
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    if (entry.name.startsWith(".")) continue
    if (!ID_PATTERN.test(entry.name)) {
      problems.push({
        file: `${CATALOG_DIR}/${entry.name}`,
        message:
          "El nombre de un tipo va en minúsculas, sin acentos y con guiones (tipos-de-maquina)",
      })
      continue
    }
    ids.push(entry.name)
  }
  return ids
}

async function entityIdsOf(
  root: string,
  typeId: string,
  problems: ContentProblem[]
): Promise<string[]> {
  const entries = await listDir(path.join(root, CATALOG_DIR, typeId))
  const ids: string[] = []
  for (const entry of entries) {
    if (!entry.isFile() || entry.name.startsWith("_")) continue
    const file = `${CATALOG_DIR}/${typeId}/${entry.name}`
    if (entry.name.endsWith(".yml")) {
      problems.push({ file, message: "La extensión es .yaml, no .yml" })
      continue
    }
    if (!entry.name.endsWith(".yaml")) continue
    const id = entry.name.slice(0, -".yaml".length)
    if (!ID_PATTERN.test(id)) {
      problems.push({
        file,
        message:
          "El nombre del fichero es el id: en minúsculas, sin acentos y con guiones (c11-sonic)",
      })
      continue
    }
    ids.push(id)
  }
  return ids
}

function checkRefs(
  fields: Record<string, FieldDefinition>,
  file: string,
  typeIds: readonly string[],
  problems: ContentProblem[],
  prefix = ""
) {
  for (const [name, field] of Object.entries(fields)) {
    checkFieldRefs(field, `${prefix}${name}`, file, typeIds, problems)
  }
}

function checkFieldRefs(
  field: FieldDefinition,
  at: string,
  file: string,
  typeIds: readonly string[],
  problems: ContentProblem[]
) {
  if (field.tipo === "ref" && !typeIds.includes(field.a)) {
    const known = typeIds.join(", ")
    problems.push({
      file,
      message: `${at}: \`a: ${field.a}\` no es ningún tipo de ${CATALOG_DIR}/ (hay: ${known})`,
    })
  }
  if (field.tipo === "lista") {
    checkFieldRefs(field.de, `${at}.de`, file, typeIds, problems)
  }
  if (field.tipo === "objeto") {
    checkRefs(field.campos, file, typeIds, problems, `${at}.campos.`)
  }
}

/** Pages a `ficha` field can name: paths in docs/ without `.mdx`, a folder's `index.mdx` as the folder. */
async function docPagePaths(root: string): Promise<string[]> {
  const dir = path.join(root, DOCS_DIR)
  const entries = await listDocFiles(dir)
  const paths: string[] = []
  for (const entry of entries) {
    const page = pagePathOf(entry.split(path.sep).join("/"))
    if (page !== undefined) paths.push(page)
  }
  return paths.sort()
}

async function listDocFiles(dir: string): Promise<string[]> {
  try {
    return await readdir(dir, { recursive: true })
  } catch (error) {
    if (isMissingFile(error)) return []
    throw error
  }
}

function pagePathOf(file: string): string | undefined {
  if (!file.endsWith(".mdx")) return undefined
  const withoutExt = file.slice(0, -".mdx".length)
  if (withoutExt === "index") return undefined
  if (withoutExt.endsWith("/index"))
    return withoutExt.slice(0, -"/index".length)
  return withoutExt
}
