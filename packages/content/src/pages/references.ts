import type { Catalog, Entity } from "#contract/catalog"
import { entityPath } from "#contract/catalog-paths"
import type { FieldDefinition } from "#contract/meta-schema"

// Who points at an entity, for its generated page: the pages that cite it
// (a `ref` field of their header, or a `catalogo:` link in their body) and
// the entities of other types whose `ref` fields name it, at any depth.

/** An entity named by a `ref` value. */
export type EntityRef = { type: string; id: string }

/** Every `ref` value in `values`, walked by their field definitions. */
export function refsIn(
  values: Readonly<Record<string, unknown>>,
  fields: Readonly<Record<string, FieldDefinition>>
): EntityRef[] {
  const refs: EntityRef[] = []
  for (const [name, field] of Object.entries(fields))
    collectRefs(values[name], field, refs)
  return refs
}

function collectRefs(
  value: unknown,
  field: FieldDefinition,
  refs: EntityRef[]
): void {
  if (value === undefined || value === null) return
  if (field.tipo === "ref" && typeof value === "string") {
    refs.push({ type: field.a, id: value })
    return
  }
  if (field.tipo === "lista" && Array.isArray(value)) {
    for (const item of value) collectRefs(item, field.de, refs)
    return
  }
  if (field.tipo === "objeto" && typeof value === "object") {
    for (const [name, inner] of Object.entries(field.campos))
      collectRefs(Reflect.get(value, name), inner, refs)
  }
}

/**
 * For each entity (by its generated page path), the entities that name it,
 * grouped by their type in catalog order, each group ordered by label.
 */
export type ReverseRefs = ReadonlyMap<string, ReadonlyMap<string, Entity[]>>

export function reverseRefs(catalog: Catalog): ReverseRefs {
  const found = new Map<string, Map<string, Entity[]>>()
  for (const type of catalog.values()) {
    for (const entity of type.entities.values()) {
      const named = new Set(
        refsIn(entity.values, type.definition.campos).map((ref) =>
          entityPath(ref.type, ref.id)
        )
      )
      for (const target of named) {
        const byType = mapAt(found, target)
        const list = byType.get(type.id)
        if (list === undefined) byType.set(type.id, [entity])
        else list.push(entity)
      }
    }
  }
  for (const byType of found.values())
    for (const list of byType.values())
      list.sort((a, b) => collator.compare(a.label, b.label))
  return found
}

function mapAt(
  found: Map<string, Map<string, Entity[]>>,
  key: string
): Map<string, Entity[]> {
  const existing = found.get(key)
  if (existing !== undefined) return existing
  const created = new Map<string, Entity[]>()
  found.set(key, created)
  return created
}

const collator = new Intl.Collator("es", { numeric: true })
