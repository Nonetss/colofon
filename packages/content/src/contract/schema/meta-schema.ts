import { z } from "zod"
import { enumOf } from "#contract/schema/enum-of"
import { iconName } from "#contract/schema/icon-name"

// The meta-schema: what a content repository may declare. The platform
// knows nothing about the domain (machines, fruits…); it only fixes the
// shape of `doc.config.yaml`, of each `catalog/<type>/_type.yaml` and the
// field kinds both use. Descriptions and messages are in Spanish: they are
// shown to whoever writes the content, in the editor and in the errors.

/** Major versions of the content contract this platform reads. */
export const CONTRACT_VERSIONS = ["2"] as const

/** Field kinds that take no parameters. */
export const SCALAR_FIELD_KINDS = [
  "text",
  "number",
  "integer",
  "boolean",
  "date",
  "url",
  "email",
  "ip",
  "page",
] as const

/** Header fields every page has; a site cannot redeclare them. */
export const PAGE_HEADER_FIELDS = [
  "title",
  "description",
  "icon",
  "order",
  "updated",
] as const

/** Fields every entity accepts without declaring them. */
export const ENTITY_RESERVED_FIELDS = ["source", "updated"] as const

/** Column that shows an entity's id, available in every type's `view`. */
export const ID_COLUMN = "id"

export type ScalarFieldKind = (typeof SCALAR_FIELD_KINDS)[number]

type FieldModifiers = {
  optional?: boolean | undefined
  description?: string | undefined
  /** How the reader names the field; its name when unset. */
  label?: string | undefined
}

/** One field of a catalog type, of an object field or of the page header. */
export type FieldDefinition = FieldModifiers &
  (
    | { type: ScalarFieldKind }
    | { type: "enum"; values: string[] }
    | { type: "ref"; to: string }
    | { type: "list"; of: FieldDefinition }
    | { type: "object"; fields: Record<string, FieldDefinition> }
  )

export type MetaSchemaOptions = {
  /**
   * The catalog types that exist. When given, `ref`'s `to` must be one of
   * them, which is what lets the editor suggest them; without it any name
   * passes and the loader checks the references afterwards.
   */
  typeIds?: readonly string[] | undefined
  /**
   * What a `menu.yaml` entry can name. When given, an entry's path must be
   * one of them, which is what lets the editor suggest them; without it any
   * text passes and the site checks the paths against the pages.
   */
  menuPaths?: readonly string[] | undefined
}

const fieldName = z.string().regex(/^[a-z][a-z0-9_]*$/, {
  error:
    "Los nombres de campo van en minúsculas, sin acentos ni espacios (centro, ip_publica)",
})

function typeIdSchema(typeIds: readonly string[] | undefined) {
  if (typeIds === undefined) return z.string().min(1)
  return enumOf(typeIds, "No hay ningún tipo en catalog/")
}

function menuPathSchema(menuPaths: readonly string[] | undefined) {
  if (menuPaths === undefined) return z.string().min(1)
  return enumOf(menuPaths, "No hay ninguna página en docs/")
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
    optional: z.boolean().optional().meta({
      description: "true si el campo puede faltar. Por defecto es obligatorio",
    }),
    description: z.string().min(1).optional().meta({
      description:
        "Para qué sirve el campo. Sale como ayuda en el editor y la lee la IA",
    }),
    label: z.string().min(1).optional().meta({
      description:
        "Cómo se llama el campo en el lector (fichas, tablas y cabecera). Sin ella se muestra su nombre",
    }),
  }

  // Recursive through getters, so `list` and `object` reuse these same
  // instances and the JSON Schema conversion sees the cycle.
  const fieldDefinition: z.ZodType<FieldDefinition> = z.discriminatedUnion(
    "type",
    [
      z.strictObject({
        type: z.enum(SCALAR_FIELD_KINDS).meta({
          description:
            "Tipo del campo. `page` es la ruta de una página de docs/ (contenedores/komodo)",
        }),
        ...modifiers,
      }),
      z.strictObject({
        type: z.literal("enum").meta({
          description: "Uno de los valores de `values`",
        }),
        values: z
          .array(z.string().min(1))
          .min(1)
          .meta({ description: "Los valores que admite el campo" }),
        ...modifiers,
      }),
      z.strictObject({
        type: z.literal("ref").meta({
          description: "El id de una entidad de otro tipo del catálogo",
        }),
        to: typeIdSchema(options.typeIds).meta({
          description: "El tipo al que apunta: el nombre de su carpeta",
        }),
        ...modifiers,
      }),
      z.strictObject({
        type: z.literal("list").meta({
          description: "Varios valores; `of` es el campo que se repite",
        }),
        get of(): z.ZodType<FieldDefinition> {
          return fieldDefinition
        },
        ...modifiers,
      }),
      z.strictObject({
        type: z.literal("object").meta({
          description: "Un grupo de campos con nombre",
        }),
        get fields(): z.ZodType<Record<string, FieldDefinition>> {
          return fieldMap
        },
        ...modifiers,
      }),
    ]
  )

  const fieldMap = z
    .record(fieldName, fieldDefinition)
    .superRefine(requireSomeField)
    .meta({ description: "Los campos, cada uno con su `type`" })

  const typeDefinition = z
    .strictObject({
      name: z.string().min(1).meta({
        description: "Nombre del tipo en singular (Máquina)",
      }),
      plural: z.string().min(1).meta({
        description: "Nombre del tipo en plural (Máquinas)",
      }),
      icon: iconName.optional(),
      description: z.string().min(1).optional().meta({
        description: "Qué entra en este tipo y qué no",
      }),
      title_field: fieldName.optional().meta({
        description:
          "El campo que se muestra como nombre de cada entidad. Si falta, su id",
      }),
      fields: fieldMap.superRefine(
        rejectNames(
          ENTITY_RESERVED_FIELDS,
          "toda entidad lo admite sin declararlo"
        )
      ),
      view: z
        .strictObject({
          columns: z
            .array(fieldName)
            .min(1)
            .meta({ description: "Columnas de la tabla del tipo, en orden" }),
        })
        .optional()
        .meta({ description: "Cómo se muestra la lista del tipo" }),
    })
    .superRefine((type, ctx) => {
      const declared = Object.keys(type.fields)
      const reserved: readonly string[] = ENTITY_RESERVED_FIELDS
      if (
        type.title_field !== undefined &&
        !declared.includes(type.title_field)
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["title_field"],
          message: `\`${type.title_field}\` no es ninguno de los campos`,
        })
      }
      const columns = type.view?.columns ?? []
      columns.forEach((column, position) => {
        if (column === ID_COLUMN) return
        if (declared.includes(column)) return
        if (reserved.includes(column)) return
        ctx.addIssue({
          code: "custom",
          path: ["view", "columns", position],
          message: `\`${column}\` no es ninguno de los campos`,
        })
      })
    })

  const siteConfig = z.strictObject({
    name: z.string().min(1).meta({ description: "Nombre del sitio" }),
    description: z.string().min(1).optional().meta({
      description: "Una frase con de qué va la documentación",
    }),
    contract: z
      .enum(CONTRACT_VERSIONS, {
        error: `\`contract\` es la versión del contrato, entre comillas: ${CONTRACT_VERSIONS.map((v) => `"${v}"`).join(", ")}`,
      })
      .meta({
        description: "Versión mayor del contrato de la plataforma que sigue",
      }),
    header: fieldMap
      .superRefine(
        rejectNames(PAGE_HEADER_FIELDS, "toda ficha lo tiene sin declararlo")
      )
      .optional()
      .meta({
        description:
          "Campos extra de la cabecera de las fichas, además de title, description, icon, order y updated",
      }),
  })

  const menuPath = menuPathSchema(options.menuPaths).meta({
    description:
      "Una página o carpeta de docs/ (network, network/dns), el catálogo (catalog) o un tipo (catalog/machines)",
  })

  const menuEntry = z.union([
    menuPath,
    z.strictObject({
      path: menuPath,
      title: z.string().min(1).optional().meta({
        description:
          "El título en el menú y en la página. Manda sobre el de su cabecera",
      }),
      icon: iconName.optional().meta({
        description: "Icono de Lucide. Manda sobre el `icon` de su cabecera",
      }),
    }),
  ])

  const menu = z.strictObject({
    sections: z
      .array(
        z.strictObject({
          title: z.string().min(1).meta({ description: "Título del grupo" }),
          icon: iconName.optional(),
          description: z.string().min(1).optional().meta({
            description: "Una frase con lo que hay en el grupo",
          }),
          pages: z.array(menuEntry).min(1).meta({
            description:
              "Lo que muestra el grupo, en orden: páginas, carpetas (con todas sus páginas), catalog o catalog/<tipo>",
          }),
        })
      )
      .min(1)
      .meta({ description: "Los grupos del menú, en orden" }),
  })

  return { fieldDefinition, typeDefinition, siteConfig, menu }
}

type MetaSchemas = ReturnType<typeof createMetaSchemas>

/** A parsed `catalog/<type>/_type.yaml`. */
export type TypeDefinition = z.output<MetaSchemas["typeDefinition"]>

/** A parsed `doc.config.yaml`. */
export type SiteConfig = z.output<MetaSchemas["siteConfig"]>

/** A parsed `menu.yaml`. */
export type Menu = z.output<MetaSchemas["menu"]>

/** One entry of a `menu.yaml` group, written as a path or as an object. */
export type MenuEntry = Menu["sections"][number]["pages"][number]
