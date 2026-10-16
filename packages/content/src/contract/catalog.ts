import path from "node:path"
import { entitySchema } from "#entity-schema"
import {
  CATALOG_DIR,
  type ContentDeclarations,
  type ContentProblem,
  describeIssue,
  parseYaml,
  readText,
  spanishErrors,
} from "#load"
import { ID_COLUMN, type TypeDefinition } from "#meta-schema"

// Reads every entity of a repository's catalog for the pages that show it
// (`<Entities>`, `catalogo:` links). Each file is validated against its
// type; the valid ones keep their values, a label and the page they point
// at, and the invalid ones are kept as problems of their type.

/** One valid entity of the catalog. */
export type Entity = {
  id: string
  /** The id of its catalog type. */
  type: string
  /** Its `etiqueta` value, or its id when the type has none or it is left out. */
  label: string
  /** The value of the first `ficha` field its type declares, if any. */
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
    for (const id of declarations.index.entityIds.get(typeId) ?? []) {
      const file = entityFile(typeId, id)
      const text = await readText(path.join(root, file))
      if (text === undefined) continue
      const data = parseYaml(text, file, problems)
      if (data === undefined) continue
      const result = schema.safeParse(data, { error: spanishErrors })
      if (!result.success) {
        for (const issue of result.error.issues)
          problems.push({ file, message: describeIssue(issue) })
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

/** The field shown as an entity's name: `etiqueta`, or the id column. */
export function labelField(definition: TypeDefinition): string {
  if (definition.etiqueta === undefined) return ID_COLUMN
  return definition.etiqueta
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
  for (const [name, field] of Object.entries(definition.campos)) {
    if (field.tipo !== "ficha") continue
    const value = values[name]
    if (typeof value === "string") return value
    return null
  }
  return null
}
