import path from "node:path"
import type { ZodType } from "zod"
import {
  CATALOG_DIR,
  CONFIG_FILE,
  docFolderPaths,
  docMdxFiles,
  docPagePaths,
  listDir,
  MENU_FILE,
  readText,
  TYPE_FILE,
} from "#contract/read/files"
import {
  type ContentProblem,
  describeIssue,
  spanishErrors,
} from "#contract/read/problems"
import { parseYaml } from "#contract/read/yaml"
import type { CatalogIndex } from "#contract/schema/entity-schema"
import {
  createMetaSchemas,
  type FieldDefinition,
  type Menu,
  type SiteConfig,
  type TypeDefinition,
} from "#contract/schema/meta-schema"
import {
  type ContractReading,
  contractKey,
} from "#contract/versions/contract-1"
import {
  type ContractVersion,
  contractVersionOf,
} from "#contract/versions/detect"
import { asContract2, checkContract1Version } from "#contract/versions/reading"

// Reads the declarations of a content repository: doc.config.yaml, the
// optional menu.yaml, each catalog type and the ids and pages its fields can
// point at. Entity files are listed, not read: their contents are the
// validator's job. Whether the menu's paths exist is checked with the pages,
// so a renamed page never throws the whole menu away.

export type ContentDeclarations = {
  /** The contract major version `doc.config.yaml` declares. */
  contract: ContractVersion
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

/** Loads the declarations of the content repository at `root`. */
export async function loadContent(root: string): Promise<LoadResult> {
  const problems: ContentProblem[] = []
  const meta = createMetaSchemas()

  const configData = await readYaml(root, CONFIG_FILE, problems)
  const contract = contractVersionOf(configData)
  if (contract === "1") checkContract1Version(configData, problems)
  const config = validateDeclaration(
    configData,
    CONFIG_FILE,
    meta.siteConfig,
    problems,
    { contract, file: "config" }
  )

  // A type exists when its folder does, even if its _type.yaml is broken:
  // refs to it are not reported again on top of that file's own problem.
  const menu = await readOptionalDeclaration(
    root,
    MENU_FILE,
    meta.menu,
    problems,
    { contract, file: "menu" }
  )

  const typeIds = await catalogTypeIds(root, problems)
  const types = new Map<string, TypeDefinition>()
  const entityIds = new Map<string, string[]>()
  for (const typeId of typeIds) {
    const file = `${CATALOG_DIR}/${typeId}/${TYPE_FILE}`
    const data = await readYaml(root, file, problems)
    const type = validateDeclaration(
      data,
      file,
      meta.typeDefinition,
      problems,
      {
        contract,
        file: "type",
      }
    )
    if (type !== undefined) types.set(typeId, type)
    entityIds.set(typeId, await entityIdsOf(root, typeId, problems))
  }

  if (config?.header !== undefined) {
    checkRefs(config.header, CONFIG_FILE, typeIds, problems, contract)
  }
  for (const [typeId, type] of types) {
    const file = `${CATALOG_DIR}/${typeId}/${TYPE_FILE}`
    checkRefs(type.fields, file, typeIds, problems, contract)
  }

  if (config === undefined || menu === undefined || problems.length > 0)
    return { ok: false, problems }
  const docFiles = await docMdxFiles(root)
  return {
    ok: true,
    content: {
      contract,
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

/** Like `readYaml` + `validateDeclaration`, but a missing file is `null`. */
async function readOptionalDeclaration<T>(
  root: string,
  file: string,
  schema: ZodType<T>,
  problems: ContentProblem[],
  reading: ContractReading
): Promise<T | null | undefined> {
  const text = await readText(path.join(root, file))
  if (text === undefined) return null
  const data = parseYaml(text, file, problems)
  return validateDeclaration(data, file, schema, problems, reading)
}

/** The parsed YAML of `file`; a missing or broken file is a problem. */
async function readYaml(
  root: string,
  file: string,
  problems: ContentProblem[]
): Promise<unknown> {
  const text = await readText(path.join(root, file))
  if (text === undefined) {
    problems.push({ file, message: "No existe" })
    return undefined
  }
  return parseYaml(text, file, problems)
}

function validateDeclaration<T>(
  data: unknown,
  file: string,
  schema: ZodType<T>,
  problems: ContentProblem[],
  reading: ContractReading
): T | undefined {
  if (data === undefined) return undefined
  const result = schema.safeParse(asContract2(data, file, reading, problems), {
    error: spanishErrors,
  })
  if (result.success) return result.data
  for (const issue of result.error.issues) {
    problems.push({ file, message: describeIssue(issue, reading) })
  }
  return undefined
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
  contract: ContractVersion,
  prefix = ""
) {
  for (const [name, field] of Object.entries(fields)) {
    checkFieldRefs(field, `${prefix}${name}`, file, typeIds, problems, contract)
  }
}

function checkFieldRefs(
  field: FieldDefinition,
  at: string,
  file: string,
  typeIds: readonly string[],
  problems: ContentProblem[],
  contract: ContractVersion
) {
  if (field.type === "ref" && !typeIds.includes(field.to)) {
    const known = typeIds.join(", ")
    const to = contractKey(contract, "to")
    problems.push({
      file,
      message: `${at}: \`${to}: ${field.to}\` no es ningún tipo de ${CATALOG_DIR}/ (hay: ${known})`,
    })
  }
  if (field.type === "list") {
    const of = contractKey(contract, "of")
    checkFieldRefs(field.of, `${at}.${of}`, file, typeIds, problems, contract)
  }
  if (field.type === "object") {
    const fields = contractKey(contract, "fields")
    checkRefs(
      field.fields,
      file,
      typeIds,
      problems,
      contract,
      `${at}.${fields}.`
    )
  }
}
