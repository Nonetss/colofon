import path from "node:path"
import type { ContentDeclarations } from "#contract/read/declarations"
import { CATALOG_DIR, readText } from "#contract/read/files"
import {
  type ContentProblem,
  describeIssue,
  spanishErrors,
} from "#contract/read/problems"
import { parseYaml } from "#contract/read/yaml"
import { entitySchema } from "#contract/schema/entity-schema"
import { ID_COLUMN, type TypeDefinition } from "#contract/schema/meta-schema"
import { asContract2 } from "#contract/versions/reading"
import type { ContractReading } from "#contract/versions/v1"

// Reads every entity of a repository's catalog for the pages that show it
// (`<Entities>`, `catalog:` links). Each file is validated against its
// type; the valid ones keep their values, a label and the page they point
// at, and the invalid ones are kept as problems of their type.

/** One valid entity of the catalog. */
export type Entity = {
  id: string
  /** The id of its catalog type. */
  type: string
  /** Its `title_field` value, or its id when the type has none or it is left out. */
  label: string
  /** The value of the first `page` field its type declares, if any. */
  page: string | null
  values: Readonly<Record<string, unknown>>
}

export type CatalogType = {
  id: string
  definition: TypeDefinition
  /** The valid entities by id, in id order. */
  entities: ReadonlyMap<string, Entity>
  /** The entity files that failed their type's schema. */
  problems: readonly ContentProblem[]
}

/** Every catalog type by id. */
export type Catalog = ReadonlyMap<string, CatalogType>

/** The path of an entity's file, relative to the content root. */
export function entityFile(typeId: string, id: string): string {
  return `${CATALOG_DIR}/${typeId}/${id}.yaml`
}

/** Reads and validates every entity file of the repository at `root`. */
export async function readCatalog(
  root: string,
  declarations: ContentDeclarations
): Promise<Catalog> {
  const catalog = new Map<string, CatalogType>()
  for (const [typeId, definition] of declarations.types) {
    const schema = entitySchema(definition, declarations.index)
    const entities = new Map<string, Entity>()
    const problems: ContentProblem[] = []
    const reading: ContractReading = {
      contract: declarations.contract,
      file: "entity",
    }
    for (const id of declarations.index.entityIds.get(typeId) ?? []) {
      const file = entityFile(typeId, id)
      const text = await readText(path.join(root, file))
      if (text === undefined) continue
      const data = parseYaml(text, file, problems)
      if (data === undefined) continue
      const values = asContract2(data, file, reading, problems)
      const result = schema.safeParse(values, { error: spanishErrors })
      if (!result.success) {
        for (const issue of result.error.issues)
          problems.push({ file, message: describeIssue(issue, reading) })
        continue
      }
      entities.set(id, {
        id,
        type: typeId,
        label: labelOf(definition, id, result.data),
        page: pageOf(definition, result.data),
        values: result.data,
      })
    }
    catalog.set(typeId, { id: typeId, definition, entities, problems })
  }
  return catalog
}

/** The field shown as an entity's name: `title_field`, or the id column. */
export function labelField(definition: TypeDefinition): string {
  if (definition.title_field === undefined) return ID_COLUMN
  return definition.title_field
}

function labelOf(
  definition: TypeDefinition,
  id: string,
  values: Record<string, unknown>
): string {
  const value = values[labelField(definition)]
  if (typeof value === "string" && value !== "") return value
  if (typeof value === "number") return String(value)
  return id
}

function pageOf(
  definition: TypeDefinition,
  values: Record<string, unknown>
): string | null {
  for (const [name, field] of Object.entries(definition.fields)) {
    if (field.type !== "page") continue
    const value = values[name]
    if (typeof value === "string") return value
    return null
  }
  return null
}
