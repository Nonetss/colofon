import { openapi } from "@orpc/openapi"
import { cronMeta, cronProcedure, publicProcedure } from "#index"
import { contentHandler } from "#v1/content/handler"
import { contentInput } from "#v1/content/input"
import { contentOutput } from "#v1/content/output"

// The schema endpoints are public on purpose: the editor's YAML language
// server fetches them and cannot sign in. They expose declarations, entity
// ids and page paths, never page text or entity values.
const tags = ["Content"]

export const contentRouter = {
  schemaCatalog: publicProcedure
    .meta(
      openapi({
        summary: "Content schema catalog",
        description:
          "Catalog in SchemaStore's format of the JSON Schemas for the content repository's YAML files. Point the editor's `yaml.schemaStore.url` at it. Empty without content.",
        tags,
        method: "GET",
        path: "/v1/content/schemas",
      })
    )
    .output(contentOutput.schemaCatalog)
    .handler(() => contentHandler.schemaCatalog()),

  configSchema: publicProcedure
    .meta(
      openapi({
        summary: "Schema of doc.config.yaml",
        description:
          "JSON Schema of the content repository's site configuration.",
        tags,
        method: "GET",
        path: "/v1/content/schemas/config",
      })
    )
    .output(contentOutput.configSchema)
    .handler(() => contentHandler.configSchema()),

  typeSchema: publicProcedure
    .meta(
      openapi({
        summary: "Schema of a catalog type",
        description:
          "JSON Schema of every catalogo/<type>/_tipo.yaml, listing the catalog types a reference can point at.",
        tags,
        method: "GET",
        path: "/v1/content/schemas/type",
      })
    )
    .output(contentOutput.typeSchema)
    .handler(() => contentHandler.typeSchema()),

  entitySchema: publicProcedure
    .meta(
      openapi({
        summary: "Schema of a catalog type's entities",
        description:
          "JSON Schema of each entity file of one catalog type, with the ids its references accept and the page paths a ficha field accepts. NOT_FOUND for an unknown type.",
        tags,
        method: "GET",
        path: "/v1/content/schemas/entities/{type}",
      })
    )
    .input(contentInput.entitySchema)
    .output(contentOutput.entitySchema)
    .handler(({ input }) => contentHandler.entitySchema({ input })),

  // The handler key `v1.content.sync` is stored in cron_job: never rename it.
  sync: cronProcedure
    .meta(
      openapi({
        summary: "Sync the content repository",
        description:
          "Fetches CONTENT_REPO and checks out CONTENT_REF in the backend's clone. Does nothing for a content folder or no source. Run by the scheduler every five minutes.",
        tags,
        method: "POST",
      }),
      cronMeta({ schedule: "*/5 * * * *", name: "Sincronizar contenido" })
    )
    .output(contentOutput.sync)
    .handler(() => contentHandler.sync()),
}
