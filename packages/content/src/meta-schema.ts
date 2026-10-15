import { z } from "zod"
import { enumOf } from "#enum-of"

// The meta-schema: what a content repository may declare. The platform
// knows nothing about the domain (machines, fruits…); it only fixes the
// shape of `doc.config.yaml`, of each `catalogo/<type>/_tipo.yaml` and the
// field kinds both use. Descriptions and messages are in Spanish: they are
// shown to whoever writes the content, in the editor and in the errors.

/** Major versions of the content contract this platform reads. */
export const CONTRACT_VERSIONS = ["1"] as const

/** Field kinds that take no parameters. */
export const SCALAR_FIELD_KINDS = [
  "texto",
  "numero",
  "entero",
  "booleano",
  "fecha",
  "url",
  "email",
  "ip",
  "ficha",
] as const

/** Header fields every page has; a site cannot redeclare them. */
export const PAGE_HEADER_FIELDS = [
  "titulo",
  "descripcion",
  "icono",
  "orden",
  "actualizado",
] as const

/** Fields every entity accepts without declaring them. */
export const ENTITY_RESERVED_FIELDS = ["fuente", "actualizado"] as const

/** Column that shows an entity's id, available in every type's `vista`. */
export const ID_COLUMN = "id"

export type ScalarFieldKind = (typeof SCALAR_FIELD_KINDS)[number]

type FieldModifiers = {
  opcional?: boolean | undefined
  descripcion?: string | undefined
}

/** One field of a catalog type, of an object field or of the page header. */
export type FieldDefinition = FieldModifiers &
  (
    | { tipo: ScalarFieldKind }
    | { tipo: "enum"; valores: string[] }
    | { tipo: "ref"; a: string }
    | { tipo: "lista"; de: FieldDefinition }
    | { tipo: "objeto"; campos: Record<string, FieldDefinition> }
  )

export type MetaSchemaOptions = {
  /**
   * The catalog types that exist. When given, `ref`'s `a` must be one of
   * them, which is what lets the editor suggest them; without it any name
   * passes and the loader checks the references afterwards.
   */
  typeIds?: readonly string[] | undefined
}

const fieldName = z.string().regex(/^[a-z][a-z0-9_]*$/, {
  error:
    "Los nombres de campo van en minúsculas, sin acentos ni espacios (centro, ip_publica)",
})

function typeIdSchema(typeIds: readonly string[] | undefined) {
  if (typeIds === undefined) return z.string().min(1)
  return enumOf(typeIds, "No hay ningún tipo en catalogo/")
}

function rejectNames(reserved: readonly string[], reason: string) {
  return (fields: Record<string, unknown>, ctx: z.RefinementCtx) => {
    for (const name of Object.keys(fields)) {
      if (reserved.includes(name)) {
        ctx.addIssue({
          code: "custom",
          path: [name],
          message: `\`${name}\` no se puede declarar: ${reason}`,
        })
      }
    }
  }
}

function requireSomeField(
  fields: Record<string, unknown>,
  ctx: z.RefinementCtx
) {
  if (Object.keys(fields).length === 0) {
    ctx.addIssue({ code: "custom", message: "Declara al menos un campo" })
  }
}

/** The meta-schema, with `ref` targets checked against `typeIds` if given. */
export function createMetaSchemas(options: MetaSchemaOptions = {}) {
  const modifiers = {
    opcional: z.boolean().optional().meta({
      description: "true si el campo puede faltar. Por defecto es obligatorio",
    }),
    descripcion: z.string().min(1).optional().meta({
      description:
        "Para qué sirve el campo. Sale como ayuda en el editor y la lee la IA",
    }),
  }

  // Recursive through getters, so `lista` and `objeto` reuse these same
  // instances and the JSON Schema conversion sees the cycle.
  const fieldDefinition: z.ZodType<FieldDefinition> = z.discriminatedUnion(
    "tipo",
    [
      z.strictObject({
        tipo: z.enum(SCALAR_FIELD_KINDS).meta({
          description:
            "Tipo del campo. `ficha` es la ruta de una página de docs/ (contenedores/komodo)",
        }),
        ...modifiers,
      }),
      z.strictObject({
        tipo: z.literal("enum").meta({
          description: "Uno de los valores de `valores`",
        }),
        valores: z
          .array(z.string().min(1))
          .min(1)
          .meta({ description: "Los valores que admite el campo" }),
        ...modifiers,
      }),
      z.strictObject({
        tipo: z.literal("ref").meta({
          description: "El id de una entidad de otro tipo del catálogo",
        }),
        a: typeIdSchema(options.typeIds).meta({
          description: "El tipo al que apunta: el nombre de su carpeta",
        }),
        ...modifiers,
      }),
      z.strictObject({
        tipo: z.literal("lista").meta({
          description: "Varios valores; `de` es el campo que se repite",
        }),
        get de(): z.ZodType<FieldDefinition> {
          return fieldDefinition
        },
        ...modifiers,
      }),
      z.strictObject({
        tipo: z.literal("objeto").meta({
          description: "Un grupo de campos con nombre",
        }),
        get campos(): z.ZodType<Record<string, FieldDefinition>> {
          return fieldMap
        },
        ...modifiers,
      }),
    ]
  )

  const fieldMap = z
    .record(fieldName, fieldDefinition)
    .superRefine(requireSomeField)
    .meta({ description: "Los campos, cada uno con su `tipo`" })

  const typeDefinition = z
    .strictObject({
      nombre: z.string().min(1).meta({
        description: "Nombre del tipo en singular (Máquina)",
      }),
      plural: z.string().min(1).meta({
        description: "Nombre del tipo en plural (Máquinas)",
      }),
      icono: z.string().min(1).optional().meta({
        description: "Icono de Lucide (server, box, map-pin…)",
      }),
      descripcion: z.string().min(1).optional().meta({
        description: "Qué entra en este tipo y qué no",
      }),
      etiqueta: fieldName.optional().meta({
        description:
          "El campo que se muestra como nombre de cada entidad. Si falta, su id",
      }),
      campos: fieldMap.superRefine(
        rejectNames(
          ENTITY_RESERVED_FIELDS,
          "toda entidad lo admite sin declararlo"
        )
      ),
      vista: z
        .strictObject({
          columnas: z
            .array(fieldName)
            .min(1)
            .meta({ description: "Columnas de la tabla del tipo, en orden" }),
        })
        .optional()
        .meta({ description: "Cómo se muestra la lista del tipo" }),
    })
    .superRefine((type, ctx) => {
      const declared = Object.keys(type.campos)
      const reserved: readonly string[] = ENTITY_RESERVED_FIELDS
      if (type.etiqueta !== undefined && !declared.includes(type.etiqueta)) {
        ctx.addIssue({
          code: "custom",
          path: ["etiqueta"],
          message: `\`${type.etiqueta}\` no es ninguno de los campos`,
        })
      }
      const columns = type.vista?.columnas ?? []
      columns.forEach((column, position) => {
        if (column === ID_COLUMN) return
        if (declared.includes(column)) return
        if (reserved.includes(column)) return
        ctx.addIssue({
          code: "custom",
          path: ["vista", "columnas", position],
          message: `\`${column}\` no es ninguno de los campos`,
        })
      })
    })

  const siteConfig = z.strictObject({
    nombre: z.string().min(1).meta({ description: "Nombre del sitio" }),
    descripcion: z.string().min(1).optional().meta({
      description: "Una frase con de qué va la documentación",
    }),
    plataforma: z
      .enum(CONTRACT_VERSIONS, {
        error: `\`plataforma\` es la versión del contrato, entre comillas: ${CONTRACT_VERSIONS.map((v) => `"${v}"`).join(", ")}`,
      })
      .meta({
        description: "Versión mayor de la plataforma con la que es compatible",
      }),
    cabecera: fieldMap
      .superRefine(
        rejectNames(PAGE_HEADER_FIELDS, "toda ficha lo tiene sin declararlo")
      )
      .optional()
      .meta({
        description:
          "Campos extra de la cabecera de las fichas, además de titulo, descripcion, icono, orden y actualizado",
      }),
  })

  return { fieldDefinition, typeDefinition, siteConfig }
}

type MetaSchemas = ReturnType<typeof createMetaSchemas>

/** A parsed `catalogo/<type>/_tipo.yaml`. */
export type TypeDefinition = z.output<MetaSchemas["typeDefinition"]>

/** A parsed `doc.config.yaml`. */
export type SiteConfig = z.output<MetaSchemas["siteConfig"]>
