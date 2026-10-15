import { z } from "zod"
import { enumOf } from "#enum-of"
import type { FieldDefinition, TypeDefinition } from "#meta-schema"

/** What entity fields can point at. */
export type CatalogIndex = {
  /** The entity ids of each catalog type, by type id. */
  entityIds: ReadonlyMap<string, readonly string[]>
  /** The pages of docs/ a `ficha` field can name (`contenedores/komodo`). */
  pagePaths: readonly string[]
}

/** The schema of one field's value, with its description attached. */
export function fieldSchema(
  field: FieldDefinition,
  index: CatalogIndex
): z.ZodType {
  const schema = valueSchema(field, index)
  if (field.descripcion === undefined) return schema
  return schema.meta({ description: field.descripcion })
}

function valueSchema(field: FieldDefinition, index: CatalogIndex): z.ZodType {
  switch (field.tipo) {
    case "texto":
      return z.string().min(1)
    case "numero":
      return z.number()
    case "entero":
      return z.int()
    case "booleano":
      return z.boolean()
    case "fecha":
      return z.iso.date({ error: "Una fecha AAAA-MM-DD (2026-10-15)" })
    case "url":
      return z.url()
    case "email":
      return z.email()
    case "ip":
      return z.union([z.ipv4(), z.ipv6()], {
        error: "Una IP (192.168.1.10)",
      })
    case "ficha":
      return enumOf(index.pagePaths, "No hay ninguna ficha en docs/")
    case "enum":
      return enumOf(field.valores, "El campo no tiene `valores`")
    case "ref":
      return enumOf(
        index.entityIds.get(field.a) ?? [],
        `No hay ninguna entidad en catalogo/${field.a}/`
      )
    case "lista":
      return z.array(fieldSchema(field.de, index))
    case "objeto":
      return z.strictObject(objectShape(field.campos, index))
  }
}

function objectShape(
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
  if (field.opcional === true) return schema.optional()
  return schema
}

/** The schema of one entity file of `type`. */
export function entitySchema(type: TypeDefinition, index: CatalogIndex) {
  return z
    .strictObject({
      ...objectShape(type.campos, index),
      fuente: z.string().min(1).optional().meta({
        description:
          "De dónde sale el dato: manual, o la conexión de la que se importó (komodo)",
      }),
      actualizado: z.iso
        .date({ error: "Una fecha AAAA-MM-DD (2026-10-15)" })
        .optional()
        .meta({ description: "Fecha del dato, AAAA-MM-DD" }),
    })
    .meta({ title: type.nombre, description: type.descripcion })
}
