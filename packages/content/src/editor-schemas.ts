import { z } from "zod"
import { entitySchema } from "#entity-schema"
import {
  CATALOG_DIR,
  CONFIG_FILE,
  type ContentDeclarations,
  TYPE_FILE,
} from "#load"
import { createMetaSchemas } from "#meta-schema"

// JSON Schemas for the editor: the YAML language server (Red Hat's YAML
// extension) completes, validates and documents a file once a schema is
// associated with it. The meta-schema covers doc.config.yaml and each
// _tipo.yaml; each catalog type gets its own schema, generated from its
// _tipo.yaml, with the ids its `ref` fields can take. The editor finds them
// through a catalog in SchemaStore's format (`schemaCatalog`), set once as
// its `yaml.schemaStore.url`.

/** Name of the schema of `doc.config.yaml`. */
export const CONFIG_SCHEMA = "config"
/** Name of the schema of every `_tipo.yaml`. */
export const TYPE_SCHEMA = "type"
/** Prefix of the name of each catalog type's entity schema. */
export const ENTITY_SCHEMA_PREFIX = "entities/"

export type EditorSchema = {
  /** Stable name: `config`, `type` or `entities/<type>`. */
  name: string
  title: string
  description: string
  /** Globs of the files it applies to, relative to the content root. */
  patterns: string[]
  schema: Record<string, unknown>
}

/** Every schema the editor needs for the content `declarations`. */
export function editorSchemas(
  declarations: ContentDeclarations
): EditorSchema[] {
  const meta = createMetaSchemas({ typeIds: [...declarations.types.keys()] })
  const schemas: EditorSchema[] = [
    {
      name: CONFIG_SCHEMA,
      title: "Configuración del sitio",
      description: `El ${CONFIG_FILE} del repositorio de contenido`,
      patterns: [CONFIG_FILE],
      schema: toJsonSchema(meta.siteConfig, "Configuración del sitio"),
    },
    {
      name: TYPE_SCHEMA,
      title: "Tipo del catálogo",
      description: `El ${TYPE_FILE} de cada tipo de ${CATALOG_DIR}/`,
      patterns: [`${CATALOG_DIR}/*/${TYPE_FILE}`],
      schema: toJsonSchema(meta.typeDefinition, "Tipo del catálogo"),
    },
  ]
  for (const [typeId, type] of declarations.types) {
    schemas.push({
      name: `${ENTITY_SCHEMA_PREFIX}${typeId}`,
      title: type.plural,
      description: `Cada entidad de ${CATALOG_DIR}/${typeId}/`,
      patterns: [
        `${CATALOG_DIR}/${typeId}/*.yaml`,
        `!${CATALOG_DIR}/${typeId}/_*.yaml`,
      ],
      schema: toJsonSchema(entitySchema(type, declarations.index), type.nombre),
    })
  }
  return schemas
}

function toJsonSchema(
  schema: z.ZodType,
  title: string
): Record<string, unknown> {
  const json = z.toJSONSchema(schema, {
    target: "draft-07",
    io: "input",
    unrepresentable: "any",
  })
  return { ...json, title }
}

/** A schema catalog in SchemaStore's format, as `yaml.schemaStore.url` reads it. */
export type SchemaCatalog = {
  version: 1
  schemas: {
    name: string
    description: string
    url: string
    fileMatch: string[]
  }[]
}

/**
 * The catalog of `schemas`, each served at `<baseUrl>/<name>`. `fileMatch`
 * keeps the patterns relative: the editor matches them at any depth, so they
 * work whichever folder it has open.
 */
export function schemaCatalog(
  schemas: EditorSchema[],
  baseUrl: string
): SchemaCatalog {
  const base = baseUrl.replace(/\/+$/, "")
  return {
    version: 1,
    schemas: schemas.map((schema) => ({
      name: schema.title,
      description: schema.description,
      url: `${base}/${schema.name}`,
      fileMatch: schema.patterns,
    })),
  }
}
