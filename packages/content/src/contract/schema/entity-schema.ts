import { z } from "zod"
import { enumOf } from "#contract/schema/enum-of"
import type {
  FieldDefinition,
  TypeDefinition,
} from "#contract/schema/meta-schema"

/** What entity fields can point at. */
export type CatalogIndex = {
  /** The entity ids of each catalog type, by type id. */
  entityIds: ReadonlyMap<string, readonly string[]>
  /** The pages of docs/ a `page` field can name (`contenedores/komodo`). */
  pagePaths: readonly string[]
  /** Every folder of docs/ that holds a page (`contenedores`, `contenedores/komodo`). */
  folderPaths: readonly string[]
}

/** The schema of one field's value, titled with its label and described. */
export function fieldSchema(
  field: FieldDefinition,
  index: CatalogIndex
): z.ZodType {
  const schema = valueSchema(field, index)
  if (field.description === undefined && field.label === undefined)
    return schema
  return schema.meta({ title: field.label, description: field.description })
}

function valueSchema(field: FieldDefinition, index: CatalogIndex): z.ZodType {
  switch (field.type) {
    case "text":
      return z.string().min(1)
    case "number":
      return z.number()
    case "integer":
      return z.int()
    case "boolean":
      return z.boolean()
    case "date":
      return z.iso.date({ error: "Una fecha AAAA-MM-DD (2026-10-15)" })
    case "url":
      return z.url()
    case "email":
      return z.email()
    case "ip":
      return z.union([z.ipv4(), z.ipv6()], {
        error: "Una IP (192.168.1.10)",
      })
    case "page":
      return enumOf(index.pagePaths, "No hay ninguna ficha en docs/")
    case "enum":
      return enumOf(field.values, "El campo no tiene valores")
    case "ref":
      return enumOf(
        index.entityIds.get(field.to) ?? [],
        `No hay ninguna entidad en catalog/${field.to}/`
      )
    case "list":
      return z.array(fieldSchema(field.of, index))
    case "object":
      return z.strictObject(objectShape(field.fields, index))
  }
}

export function objectShape(
  fields: Record<string, FieldDefinition>,
  index: CatalogIndex
): Record<string, z.ZodType> {
  const shape: Record<string, z.ZodType> = {}
  for (const [name, field] of Object.entries(fields)) {
    shape[name] = withPresence(field, fieldSchema(field, index))
  }
  return shape
}

function withPresence(field: FieldDefinition, schema: z.ZodType): z.ZodType {
  if (field.optional === true) return schema.optional()
  return schema
}

/** The schema of one entity file of `type`. */
export function entitySchema(type: TypeDefinition, index: CatalogIndex) {
  return z
    .strictObject({
      ...objectShape(type.fields, index),
      source: z.string().min(1).optional().meta({
        description:
          "De dónde sale el dato: manual, o la conexión de la que se importó (komodo)",
      }),
      updated: z.iso
        .date({ error: "Una fecha AAAA-MM-DD (2026-10-15)" })
        .optional()
        .meta({ description: "Fecha del dato, AAAA-MM-DD" }),
    })
    .meta({ title: type.name, description: type.description })
}
