import { z } from "zod"

const jsonSchema = z
  .record(z.string(), z.unknown())
  .describe("A JSON Schema (draft-07) for one kind of content file")

const repository = z.object({
  id: z.uuid(),
  slug: z.string(),
  name: z.string(),
  url: z
    .string()
    .describe(
      "URL of the git repository, with any credentials replaced by ***; /git/<slug>.git for a hosted one"
    ),
  hosted: z.boolean().describe("Whether the platform hosts the repository"),
  pushUrl: z
    .string()
    .nullable()
    .describe(
      "Absolute git URL to clone and push a hosted repository; null for an external one"
    ),
  ref: z.string().describe("Branch, tag or commit checked out"),
  path: z
    .string()
    .describe(
      "Folder of the git repository the content is read from; empty for the root"
    ),
  catalogUrl: z
    .string()
    .describe(
      "Absolute URL of the repository's schema catalog, for the editor's yaml.schemaStore.url"
    ),
  lastSyncedAt: z
    .string()
    .nullable()
    .describe("When the last sync ran, null before the first one"),
  lastCommit: z
    .string()
    .nullable()
    .describe("Commit checked out by the last successful sync"),
  lastSyncError: z
    .string()
    .nullable()
    .describe("Error of the last sync when it failed, without credentials"),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type ContentRepositoryOutput = z.infer<typeof repository>

// A user's repository: external and not in the editor's schema catalog.
const ownRepository = repository.omit({
  hosted: true,
  pushUrl: true,
  catalogUrl: true,
})

export type OwnRepositoryOutput = z.infer<typeof ownRepository>

const folderEntry = z.object({
  name: z.string(),
  path: z.string().describe("Path from the repository root"),
  kind: z.enum(["folder", "file", "submodule"]),
  size: z.number().int().nullable().describe("Bytes, for a file"),
})

export const contentOutput = {
  schemaCatalog: z
    .object({
      version: z.literal(1),
      schemas: z.array(
        z.object({
          name: z.string().describe("Title of the schema"),
          description: z.string(),
          url: z.string().describe("Absolute URL of the schema"),
          fileMatch: z
            .array(z.string())
            .describe(
              "Globs of the files it applies to, relative to the content root; a leading ! excludes"
            ),
        })
      ),
    })
    .describe("Schema catalog in SchemaStore's format"),
  configSchema: jsonSchema,
  menuSchema: jsonSchema,
  diagramSchema: jsonSchema,
  typeSchema: jsonSchema,
  entitySchema: jsonSchema,
  listRepositories: z.array(repository),
  listMyRepositories: z.object({
    limit: z.number().int().describe("How many repositories a user may own"),
    repositories: z.array(ownRepository),
  }),
  createMyRepository: ownRepository,
  updateMyRepository: ownRepository,
  deleteMyRepository: z.object({ id: z.uuid(), success: z.boolean() }),
  createRepository: repository,
  updateRepository: repository,
  listBranches: z.object({
    branches: z.array(z.string()).describe("Branch names, sorted"),
    defaultBranch: z
      .string()
      .nullable()
      .describe("The branch the remote's HEAD points at, when it has one"),
  }),
  listContentFolders: z.object({
    folders: z
      .array(z.string())
      .describe(
        "Folders that hold a doc.config.yaml, the root as an empty path first, then in order; at most 50"
      ),
  }),
  readFolder: z.object({
    entries: z
      .array(folderEntry)
      .describe("The folder's entries, folders first, then by name"),
  }),
  readFile: z.object({
    path: z.string(),
    size: z.number().int().describe("Bytes"),
    kind: z
      .enum(["text", "binary", "too-large"])
      .describe("Whether the content is included, and why not"),
    content: z
      .string()
      .nullable()
      .describe("UTF-8 text of a text file within the size limit; else null"),
  }),
  deleteRepository: z.object({ id: z.uuid(), success: z.boolean() }),
  syncRepository: repository,
  sync: z.object({
    repositories: z.array(
      z.object({
        slug: z.string(),
        commit: z.string().describe("Commit checked out"),
      })
    ),
  }),
}
