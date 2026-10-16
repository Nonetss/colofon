import { z } from "zod"
import { catalogTypePath } from "#contract/catalog-paths"
import { entitySchema } from "#contract/entity-schema"
import {
  CATALOG_DIR,
  CATALOG_PATH,
  CONFIG_FILE,
  type ContentDeclarations,
  DIAGRAMS_DIR,
  MENU_FILE,
  TYPE_FILE,
} from "#contract/load"
import { createMetaSchemas } from "#contract/meta-schema"
import { diagramSchemas, type References } from "#diagrams/schema"
import { DIAGRAM_TYPES } from "#diagrams/types/index"

// JSON Schemas for the editor: the YAML language server (Red Hat's YAML
// extension) completes, validates and documents a file once a schema is
// associated with it. The meta-schema covers doc.config.yaml, menu.yaml
// (with the paths an entry can name) and each _tipo.yaml; diagrams (JSON)
// get one schema, every form of them (drawn, chain and each typed form by
// its `type`), with the entities and pages a box or item can link to; each
// catalog type gets its own
// schema, generated from its _tipo.yaml, with the ids its `ref` fields can
// take. Every `icono` lists the Lucide names. The editor finds them
// through a catalog in SchemaStore's format (`schemaCatalog`), set once as
// its `yaml.schemaStore.url`.

/** Name of the schema of `doc.config.yaml`. */
export const CONFIG_SCHEMA = "config"
/** Name of the schema of `menu.yaml`. */
export const MENU_SCHEMA = "menu"
/** Name of the schema of every diagram file. */
export const DIAGRAM_SCHEMA = "diagram"
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
  const typeIds = [...declarations.types.keys()]
  const meta = createMetaSchemas({
    typeIds,
    menuPaths: menuPathsOf(declarations),
  })
  const diagram = diagramFileSchema({
    entityKeys: entityKeysOf(declarations),
    pagePaths: pagePathsOf(declarations),
  })
  const schemas: EditorSchema[] = [
    {
      name: CONFIG_SCHEMA,
      title: "Configuración del sitio",
      description: `El ${CONFIG_FILE} del repositorio de contenido`,
      patterns: [CONFIG_FILE],
      schema: toJsonSchema(meta.siteConfig, "Configuración del sitio"),
    },
    {
      name: MENU_SCHEMA,
      title: "Menú",
      description: `El ${MENU_FILE}: los grupos de la barra lateral`,
      patterns: [MENU_FILE],
      schema: toJsonSchema(meta.menu, "Menú"),
    },
    {
      name: DIAGRAM_SCHEMA,
      title: "Diagrama",
      description: `Cada diagrama de ${DIAGRAMS_DIR}/`,
      patterns: [`${DIAGRAMS_DIR}/*.json`],
      schema: toJsonSchema(diagram, "Diagrama"),
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

/** What a menu entry can name: pages, folders, the catalog and its types. */
function menuPathsOf(declarations: ContentDeclarations): string[] {
  const { pagePaths, folderPaths } = declarations.index
  const typePaths = [...declarations.types.keys()].map(catalogTypePath)
  return [
    ...new Set([...folderPaths, ...pagePaths, CATALOG_PATH, ...typePaths]),
  ].sort()
}

/**
 * A diagram file in any of its forms: drawn or chain (no `type`), or one of
 * the typed forms, each told apart by its `type`.
 */
function diagramFileSchema(references: References): z.ZodType {
  const { drawn, chain } = diagramSchemas(references)
  return z.union([
    drawn,
    chain,
    ...DIAGRAM_TYPES.map((form) => form.schema(references)),
  ])
}

/** Every page path of the repository, for a diagram box's `page`. */
function pagePathsOf(declarations: ContentDeclarations): string[] {
  return [...declarations.index.pagePaths].sort()
}

/** Every entity of the catalog as `<type>/<id>`, for a diagram box. */
function entityKeysOf(declarations: ContentDeclarations): string[] {
  const keys: string[] = []
  for (const [typeId, ids] of declarations.index.entityIds)
    for (const id of ids) keys.push(`${typeId}/${id}`)
  return keys.sort()
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
