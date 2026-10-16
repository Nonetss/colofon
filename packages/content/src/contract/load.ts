import type { Dirent } from "node:fs"
import { readdir, readFile } from "node:fs/promises"
import path from "node:path"
// jsonc-parser's `main` is a UMD build whose `require`s of its own files the
// backend bundle cannot follow (it fails at start with "Cannot find module
// './impl/format'"), so the ESM build is imported directly.
import {
  type ParseError,
  parse as parseJsonText,
  printParseErrorCode,
} from "jsonc-parser/lib/esm/main.js"
import { parse, YAMLParseError } from "yaml"
import { type ZodType, z } from "zod"
import type { CatalogIndex } from "#contract/entity-schema"
import {
  createMetaSchemas,
  type FieldDefinition,
  type Menu,
  type SiteConfig,
  type TypeDefinition,
} from "#contract/meta-schema"

// Reads the declarations of a content repository: doc.config.yaml, the
// optional menu.yaml, each catalog type and the ids and pages its fields can
// point at. Entity files are listed, not read: their contents are the
// validator's job. Whether the menu's paths exist is checked with the pages,
// so a renamed page never throws the whole menu away.

export const CONFIG_FILE = "doc.config.yaml"
export const CATALOG_DIR = "catalog"
export const DOCS_DIR = "docs"
export const TYPE_FILE = "_type.yaml"
export const MENU_FILE = "menu.yaml"
export const DIAGRAMS_DIR = "diagrams"
/** The page path the generated catalog pages own; docs/ can't use it. */
export const CATALOG_PATH = "catalog"

/** A problem in one file, with a path relative to the content root. */
export type ContentProblem = { file: string; message: string }

export type ContentDeclarations = {
  config: SiteConfig
  /** The parsed `menu.yaml`, `null` when the repository has none. */
  menu: Menu | null
  /** Each catalog type by id (its folder name), sorted by id. */
  types: ReadonlyMap<string, TypeDefinition>
  index: CatalogIndex
}

export type LoadResult =
  | { ok: true; content: ContentDeclarations }
  | { ok: false; problems: ContentProblem[] }

const ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/

/** Zod's Spanish messages, as the editor and the platform report them. */
export const spanishErrors = z.locales.es().localeError

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

  // A type exists when its folder does, even if its _type.yaml is broken:
  // refs to it are not reported again on top of that file's own problem.
  const menu = await readOptionalDeclaration(
    root,
    MENU_FILE,
    meta.menu,
    problems
  )

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

  if (config === undefined || menu === undefined || problems.length > 0)
    return { ok: false, problems }
  const docFiles = await docMdxFiles(root)
  return {
    ok: true,
    content: {
      config,
      menu,
      types,
      index: {
        entityIds,
        pagePaths: docPagePaths(docFiles),
        folderPaths: docFolderPaths(docFiles),
      },
    },
  }
}

/** Like `readDeclaration`, but a missing file is `null`, not a problem. */
async function readOptionalDeclaration<T>(
  root: string,
  file: string,
  schema: ZodType<T>,
  problems: ContentProblem[]
): Promise<T | null | undefined> {
  const text = await readText(path.join(root, file))
  if (text === undefined) return null
  return parseDeclaration(text, file, schema, problems)
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
  return parseDeclaration(text, file, schema, problems)
}

function parseDeclaration<T>(
  text: string,
  file: string,
  schema: ZodType<T>,
  problems: ContentProblem[]
): T | undefined {
  const data = parseYaml(text, file, problems)
  if (data === undefined) return undefined
  const result = schema.safeParse(data, { error: spanishErrors })
  if (result.success) return result.data
  for (const issue of result.error.issues) {
    problems.push({ file, message: describeIssue(issue) })
  }
  return undefined
}

export function describeIssue(issue: z.core.$ZodIssue): string {
  if (issue.path.length === 0) return issue.message
  return `${issue.path.join(".")}: ${issue.message}`
}

export async function readText(file: string): Promise<string | undefined> {
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

export function parseYaml(
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

/** What each JSON syntax error means, in the words the platform reports. */
const JSON_ERRORS: Partial<
  Record<ReturnType<typeof printParseErrorCode>, string>
> = {
  InvalidSymbol: "hay un carácter que no es JSON",
  InvalidNumberFormat: "un número mal escrito",
  PropertyNameExpected: "falta el nombre de una clave, entre comillas dobles",
  ValueExpected:
    "falta un valor (¿una coma de más al final de una lista o un objeto?)",
  ColonExpected: "falta `:` tras el nombre de una clave",
  CommaExpected: "falta una coma entre dos elementos",
  CloseBraceExpected: "falta cerrar un objeto con `}`",
  CloseBracketExpected: "falta cerrar una lista con `]`",
  EndOfFileExpected: "sobra texto tras el final",
  InvalidCommentToken: "JSON no admite comentarios",
  UnexpectedEndOfComment: "JSON no admite comentarios",
  UnexpectedEndOfString: "un texto sin cerrar",
  UnexpectedEndOfNumber: "un número sin terminar",
  InvalidUnicode: "un carácter \\u mal escrito",
  InvalidEscapeCharacter: "un carácter con \\ mal escrito",
  InvalidCharacter: "un carácter de control en un texto",
}

/**
 * Strict JSON (no comments, no trailing commas), with the line and column
 * of the first syntax error; `undefined` when it is not valid or is empty.
 */
export function parseJson(
  text: string,
  file: string,
  problems: ContentProblem[]
): unknown {
  if (text.trim() === "") {
    problems.push({ file, message: "Está vacío" })
    return undefined
  }
  const errors: ParseError[] = []
  const data: unknown = parseJsonText(text, errors, {
    disallowComments: true,
    allowTrailingComma: false,
    allowEmptyContent: false,
  })
  const [first] = errors
  if (first === undefined) return data
  const { line, column } = positionOf(text, first.offset)
  const reason = jsonErrorReason(first)
  problems.push({
    file,
    message: `JSON no válido en la línea ${line}, columna ${column}: ${reason}`,
  })
  return undefined
}

function jsonErrorReason(error: ParseError): string {
  const code = printParseErrorCode(error.error)
  const known = JSON_ERRORS[code]
  if (known !== undefined) return known
  return code
}

/** The 1-based line and column of `offset` in `text`. */
function positionOf(
  text: string,
  offset: number
): { line: number; column: number } {
  const before = text.slice(0, offset).split("\n")
  const last = before.at(-1) ?? ""
  return { line: before.length, column: last.length + 1 }
}

function yamlErrorMessage(error: YAMLParseError): string {
  const position = error.linePos?.[0]
  const reason = yamlErrorReason(error)
  if (position === undefined) return `YAML no válido: ${reason}`
  return `YAML no válido en la línea ${position.line}, columna ${position.col}: ${reason}`
}

export function yamlErrorReason(error: YAMLParseError): string {
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

/** Whether a docs/ path is under the reserved `catalog` folder. */
export function isReservedDocsPath(docsPath: string): boolean {
  return docsPath === CATALOG_PATH || docsPath.startsWith(`${CATALOG_PATH}/`)
}

/** The `.mdx` files of docs/, with `/` separators, outside `catalog/`. */
async function docMdxFiles(root: string): Promise<string[]> {
  const entries = await listDocFiles(path.join(root, DOCS_DIR))
  return entries
    .map((entry) => entry.split(path.sep).join("/"))
    .filter((file) => file.endsWith(".mdx") && !isReservedDocsPath(file))
}

/** Pages a `ficha` field can name: paths in docs/ without `.mdx`, a folder's `index.mdx` as the folder. */
function docPagePaths(files: readonly string[]): string[] {
  const paths: string[] = []
  for (const file of files) {
    const page = pagePathOf(file)
    if (page !== undefined) paths.push(page)
  }
  return paths.sort()
}

/** Every folder of docs/ that holds a page, at any depth (`containers/komodo`). */
function docFolderPaths(files: readonly string[]): string[] {
  const folders = new Set<string>()
  for (const file of files) {
    const parts = file.split("/").slice(0, -1)
    for (let depth = 1; depth <= parts.length; depth++) {
      folders.add(parts.slice(0, depth).join("/"))
    }
  }
  return [...folders].sort()
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
