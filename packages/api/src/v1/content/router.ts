import { openapi } from "@orpc/openapi"
import {
  adminProcedure,
  cronMeta,
  cronProcedure,
  protectedProcedure,
  publicProcedure,
  sessionProcedure,
} from "#index"
import { contentInput } from "#v1/content/input"
import { contentOutput } from "#v1/content/output"
import { contentHandler } from "#v1/content/runtime"

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
          "JSON Schema of every diagrams/<id>.json of a content repository, listing the entities a box can stand for as <type>/<id> and the pages it can link to.",
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
          "JSON Schema of every catalog/<type>/_type.yaml of a content repository, listing the catalog types a reference can point at.",
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
    .handler(({ context, input }) =>
      contentHandler.createRepository({ context, input })
    ),

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
    .handler(({ context, input }) =>
      contentHandler.updateRepository({ context, input })
    ),

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
    .handler(({ context, input }) =>
      contentHandler.listBranches({ context, input })
    ),

  listContentFolders: adminProcedure
    .meta(
      openapi({
        summary: "List the content folders of a git repository",
        description:
          "Folders of the git repository at `url`, or of the stored repository `slug`, that hold a doc.config.yaml at `ref` (the remote's HEAD when missing): the root as an empty path first, then the rest in order, at most 50. Only the tree is fetched. QUERY rather than GET: the URL may carry credentials. BAD_GATEWAY with the git error, without credentials, when the remote or the ref can't be read.",
        tags,
        method: "QUERY",
      })
    )
    .input(contentInput.listContentFolders)
    .output(contentOutput.listContentFolders)
    .handler(({ context, input }) =>
      contentHandler.listContentFolders({ context, input })
    ),

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

  listMyRepositories: protectedProcedure
    .meta(
      openapi({
        summary: "List the caller's own repositories",
        description:
          "The git repositories the caller added, ordered by name, private to them. Their URLs are stripped of credentials.",
        tags,
        method: "GET",
      })
    )
    .output(contentOutput.listMyRepositories)
    .handler(({ context }) => contentHandler.listMyRepositories({ context })),

  createMyRepository: protectedProcedure
    .meta(
      openapi({
        summary: "Add one of the caller's own repositories",
        description:
          "Stores an external git repository private to the caller and starts its first sync without waiting for it. The URL must be a public https one. CONFLICT when the slug is taken by any repository.",
        tags,
        method: "POST",
        successStatus: 201,
      })
    )
    .input(contentInput.createMyRepository)
    .output(contentOutput.createMyRepository)
    .handler(({ context, input }) =>
      contentHandler.createMyRepository({ context, input })
    ),

  updateMyRepository: protectedProcedure
    .meta(
      openapi({
        summary: "Edit one of the caller's own repositories",
        description:
          "Changes the name, URL or ref of a repository the caller owns, keeping the fields not sent. A new URL or ref starts a sync. NOT_FOUND for any other repository.",
        tags,
        method: "PATCH",
      })
    )
    .input(contentInput.updateMyRepository)
    .output(contentOutput.updateMyRepository)
    .handler(({ context, input }) =>
      contentHandler.updateMyRepository({ context, input })
    ),

  deleteMyRepository: protectedProcedure
    .meta(
      openapi({
        summary: "Delete one of the caller's own repositories",
        description:
          "Deletes a repository the caller owns and its clone. NOT_FOUND for any other repository.",
        tags,
        method: "DELETE",
      })
    )
    .input(contentInput.deleteMyRepository)
    .output(contentOutput.deleteMyRepository)
    .handler(({ context, input }) =>
      contentHandler.deleteMyRepository({ context, input })
    ),

  // Only from a browser session: sharing widens who reads the repository,
  // which an agent holding an API key must not do on its own.
  shareMyRepository: sessionProcedure
    .meta(
      openapi({
        summary: "Share one of the caller's repositories with organizations",
        description:
          "Replaces the organizations a repository the caller owns is shared with; their members read it while the owner is a member too. Only organizations the caller belongs to; NOT_FOUND for any other organization or repository, with nothing changed. An empty list makes it private again. Only from a browser session.",
        tags,
        method: "PUT",
      })
    )
    .input(contentInput.shareMyRepository)
    .output(contentOutput.shareMyRepository)
    .handler(({ context, input }) =>
      contentHandler.shareMyRepository({ context, input })
    ),

  listMyBranches: protectedProcedure
    .meta(
      openapi({
        summary: "List the branches of a user's git repository",
        description:
          "Branches of the public https git repository at `url`, or of one of the caller's own repositories by `slug`, and the one its HEAD points at. QUERY rather than GET: the URL may carry a token. BAD_REQUEST for an address that is not allowed; BAD_GATEWAY with the git error, without credentials, when the remote can't be read.",
        tags,
        method: "QUERY",
      })
    )
    .input(contentInput.listMyBranches)
    .output(contentOutput.listBranches)
    .handler(({ context, input }) =>
      contentHandler.listMyBranches({ context, input })
    ),

  listMyContentFolders: protectedProcedure
    .meta(
      openapi({
        summary: "List the content folders of a user's git repository",
        description:
          "Like listContentFolders, for the public https git repository at `url` or one of the caller's own repositories by `slug`. QUERY rather than GET: the URL may carry a token. BAD_REQUEST for an address that is not allowed; BAD_GATEWAY with the git error, without credentials, when the remote or the ref can't be read.",
        tags,
        method: "QUERY",
      })
    )
    .input(contentInput.listMyContentFolders)
    .output(contentOutput.listContentFolders)
    .handler(({ context, input }) =>
      contentHandler.listMyContentFolders({ context, input })
    ),

  syncRepository: protectedProcedure
    .meta(
      openapi({
        summary: "Sync a content repository now",
        description:
          "Open to every signed-in user for the repositories they read: the platform's and their own. Fetches the repository and checks out its ref, answering once done with the stored outcome. BAD_GATEWAY with the git error, without credentials, when it fails.",
        tags,
        method: "POST",
      })
    )
    .input(contentInput.syncRepository)
    .output(contentOutput.syncRepository)
    .handler(({ context, input }) =>
      contentHandler.syncRepository({ context, input })
    ),

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
