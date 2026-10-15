import { openapi } from "@orpc/openapi"
import {
  adminProcedure,
  cronMeta,
  cronProcedure,
  publicProcedure,
} from "#index"
import { contentHandler } from "#v1/content/handler"
import { contentInput } from "#v1/content/input"
import { contentOutput } from "#v1/content/output"

// The schema endpoints are public on purpose: the editor's YAML language
// server fetches them and cannot sign in. They expose declarations, entity
// ids and page paths, never page text, entity values or the repository's
// URL. Their paths, with the repository's slug, are a contract with every
// content repository's editor settings.
const tags = ["Content"]

export const contentRouter = {
  schemaCatalog: publicProcedure
    .meta(
      openapi({
        summary: "Content schema catalog",
        description:
          "Catalog in SchemaStore's format of the JSON Schemas for one content repository's YAML files. Point the editor's `yaml.schemaStore.url` at it. Empty until the repository has valid content; NOT_FOUND for an unknown repository.",
        tags,
        method: "GET",
        path: "/v1/content/schemas/{repository}",
      })
    )
    .input(contentInput.schemaCatalog)
    .output(contentOutput.schemaCatalog)
    .handler(({ input }) => contentHandler.schemaCatalog({ input })),

  configSchema: publicProcedure
    .meta(
      openapi({
        summary: "Schema of doc.config.yaml",
        description:
          "JSON Schema of a content repository's site configuration.",
        tags,
        method: "GET",
        path: "/v1/content/schemas/{repository}/config",
      })
    )
    .input(contentInput.configSchema)
    .output(contentOutput.configSchema)
    .handler(({ input }) => contentHandler.configSchema({ input })),

  menuSchema: publicProcedure
    .meta(
      openapi({
        summary: "Schema of menu.yaml",
        description:
          "JSON Schema of a content repository's menu.yaml, listing the page paths, section folders and catalog paths an entry can name and the Lucide icon names.",
        tags,
        method: "GET",
        path: "/v1/content/schemas/{repository}/menu",
      })
    )
    .input(contentInput.menuSchema)
    .output(contentOutput.menuSchema)
    .handler(({ input }) => contentHandler.menuSchema({ input })),

  diagramSchema: publicProcedure
    .meta(
      openapi({
        summary: "Schema of a diagram",
        description:
          "JSON Schema of every diagramas/<id>.yaml of a content repository, listing the entities a node can stand for as <type>/<id> and the Lucide icon names.",
        tags,
        method: "GET",
        path: "/v1/content/schemas/{repository}/diagram",
      })
    )
    .input(contentInput.diagramSchema)
    .output(contentOutput.diagramSchema)
    .handler(({ input }) => contentHandler.diagramSchema({ input })),

  typeSchema: publicProcedure
    .meta(
      openapi({
        summary: "Schema of a catalog type",
        description:
          "JSON Schema of every catalogo/<type>/_tipo.yaml of a content repository, listing the catalog types a reference can point at.",
        tags,
        method: "GET",
        path: "/v1/content/schemas/{repository}/type",
      })
    )
    .input(contentInput.typeSchema)
    .output(contentOutput.typeSchema)
    .handler(({ input }) => contentHandler.typeSchema({ input })),

  entitySchema: publicProcedure
    .meta(
      openapi({
        summary: "Schema of a catalog type's entities",
        description:
          "JSON Schema of each entity file of one catalog type of a content repository, with the ids its references accept and the page paths a ficha field accepts. NOT_FOUND for an unknown repository or type.",
        tags,
        method: "GET",
        path: "/v1/content/schemas/{repository}/entities/{type}",
      })
    )
    .input(contentInput.entitySchema)
    .output(contentOutput.entitySchema)
    .handler(({ input }) => contentHandler.entitySchema({ input })),

  listRepositories: adminProcedure
    .meta(
      openapi({
        summary: "List content repositories",
        description:
          "Every content repository, ordered by name, with its URL stripped of credentials, its catalog URL and the outcome of its last sync.",
        tags,
        method: "GET",
      })
    )
    .output(contentOutput.listRepositories)
    .handler(() => contentHandler.listRepositories()),

  createRepository: adminProcedure
    .meta(
      openapi({
        summary: "Create a content repository",
        description:
          "Stores a git content repository and starts its first sync without waiting for it. CONFLICT when the slug is taken. The slug can't change afterwards: it names the repository in the editor's schema URLs.",
        tags,
        method: "POST",
        successStatus: 201,
      })
    )
    .input(contentInput.createRepository)
    .output(contentOutput.createRepository)
    .handler(({ input }) => contentHandler.createRepository({ input })),

  updateRepository: adminProcedure
    .meta(
      openapi({
        summary: "Edit a content repository",
        description:
          "Changes a content repository's name, URL or ref, keeping the fields not sent. A new URL or ref starts a sync without waiting for it.",
        tags,
        method: "PATCH",
      })
    )
    .input(contentInput.updateRepository)
    .output(contentOutput.updateRepository)
    .handler(({ input }) => contentHandler.updateRepository({ input })),

  listBranches: adminProcedure
    .meta(
      openapi({
        summary: "List a git repository's branches",
        description:
          "Branches of the git repository at `url`, or of the stored repository `slug`, and the one its HEAD points at, read from the remote without cloning. QUERY rather than GET: the URL may carry credentials, which must not travel in a query string. BAD_GATEWAY with the git error, without credentials, when the remote can't be read.",
        tags,
        method: "QUERY",
      })
    )
    .input(contentInput.listBranches)
    .output(contentOutput.listBranches)
    .handler(({ input }) => contentHandler.listBranches({ input })),

  deleteRepository: adminProcedure
    .meta(
      openapi({
        summary: "Delete a content repository",
        description:
          "Deletes a content repository and its clone. Its schema endpoints answer NOT_FOUND afterwards.",
        tags,
        method: "DELETE",
      })
    )
    .input(contentInput.deleteRepository)
    .output(contentOutput.deleteRepository)
    .handler(({ input }) => contentHandler.deleteRepository({ input })),

  readFolder: adminProcedure
    .meta(
      openapi({
        summary: "Read a folder of a hosted repository",
        description:
          "Entries of one folder (the root when `path` is empty) on one branch of a content repository the platform hosts, read from its bare repository: folders first, then by name, with each file's size. NOT_FOUND for an unknown or external repository, a branch it lacks, or a path that is not a folder on that branch.",
        tags,
        method: "GET",
      })
    )
    .input(contentInput.readFolder)
    .output(contentOutput.readFolder)
    .handler(({ input }) => contentHandler.readFolder({ input })),

  readFile: adminProcedure
    .meta(
      openapi({
        summary: "Read a file of a hosted repository",
        description:
          "One file on one branch of a content repository the platform hosts, read from its bare repository: its size and, for a text file of at most 512 KiB, its UTF-8 content. A binary or larger file comes without content. NOT_FOUND for an unknown or external repository, a branch it lacks, or a path that is not a file on that branch.",
        tags,
        method: "GET",
      })
    )
    .input(contentInput.readFile)
    .output(contentOutput.readFile)
    .handler(({ input }) => contentHandler.readFile({ input })),

  syncRepository: adminProcedure
    .meta(
      openapi({
        summary: "Sync a content repository now",
        description:
          "Fetches the repository and checks out its ref, answering once done with the stored outcome. BAD_GATEWAY with the git error, without credentials, when it fails.",
        tags,
        method: "POST",
      })
    )
    .input(contentInput.syncRepository)
    .output(contentOutput.syncRepository)
    .handler(({ input }) => contentHandler.syncRepository({ input })),

  // The handler key `v1.content.sync` is stored in cron_job: never rename it.
  sync: cronProcedure
    .meta(
      openapi({
        summary: "Sync every content repository",
        description:
          "Fetches every content repository and checks out its ref in the backend's clones, then removes the clones of deleted repositories. One failing repository doesn't stop the rest; the run fails when any did. Run by the scheduler on boot and every five minutes.",
        tags,
        method: "POST",
      }),
      cronMeta({ schedule: "*/5 * * * *", name: "Sincronizar contenido" })
    )
    .output(contentOutput.sync)
    .handler(() => contentHandler.sync()),
}
