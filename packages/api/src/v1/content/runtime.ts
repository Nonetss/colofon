import path from "node:path"
import { CLONE_DIR, HOSTED_DIR } from "@nonete/content"
import { db } from "@nonete/db"
import { contentRepository } from "@nonete/db/schema"
import { child } from "@nonete/logger"
import { eq } from "drizzle-orm"
import {
  audienceFilter,
  createContentHandler,
  findRow,
  sharedRepositoriesOf,
  syncFields,
} from "#v1/content/handler"
import { createGitHosting, gitSourceOf } from "#v1/content/hosting"
import { createContentReader, type RepositoryStore } from "#v1/content/reader"
import { createDocsHandler } from "#v1/docs/handler"
import { withSavedAccess } from "#v1/git-credential/access"
import { createSkillsHandler } from "#v1/skills/handler"

// The content feature as the running app uses it: the stored repositories,
// the reader over their clones, the content, docs and skills handlers built
// on them, the git endpoint of the hosted repositories and the first sync.
// Routers and the backend take these instances; tests build their own with
// the factories.

/** The stored repositories, read and updated through Drizzle. */
const repositoryStore: RepositoryStore = {
  find: findRow,
  list: (audience) =>
    db.query.contentRepository.findMany({
      where: audienceFilter(audience),
      orderBy: { name: "asc" },
    }),
  sharedWith: sharedRepositoriesOf,
  recordSync: async (id, result) => {
    await db
      .update(contentRepository)
      .set(syncFields(result, new Date()))
      .where(eq(contentRepository.id, id))
  },
}

const contentLogger = child({ module: "content" })

/**
 * The clone root and the hosted root. The repo root is two levels above the
 * workspace the backend runs in, as for the root `.env`.
 */
const cloneRoot = path.resolve(process.cwd(), "../..", CLONE_DIR)
const hostedRoot = path.resolve(process.cwd(), "../..", HOSTED_DIR)

export const contentReader = createContentReader({
  cloneRoot,
  repositories: repositoryStore,
  resolveSource: (repository) => gitSourceOf(repository, hostedRoot),
  withAccess: withSavedAccess,
  logger: contentLogger,
})

export const contentHandler = createContentHandler(contentReader, {
  hostedRoot,
})

/**
 * Fetch handler of the git endpoint (`/git/<slug>.git`) that serves the
 * hosted repositories; the backend mounts it outside oRPC.
 */
export const gitHttp = createGitHosting({
  hostedRoot,
  repositories: repositoryStore,
  reader: contentReader,
  logger: contentLogger,
})

/**
 * Starts the first sync of every content repository without waiting for it:
 * a slow or unreachable remote must not delay startup. The reader already
 * logs each failed sync, so the rejection is dropped here.
 */
export function startContentSync() {
  contentLogger.info({ cloneRoot }, "Syncing content repositories")
  contentHandler.sync().catch(() => undefined)
}

export const docsHandler = createDocsHandler({
  reader: contentReader,
  repositories: repositoryStore,
})

// The platform's skills live in `packages/api/skills/` (`colofon`) and in
// `doc-example/.agents/skills/` (the writing skills, whose only copy that
// is), found from the backend's working directory (`apps/backend`, also in
// its image) as the migrations are.
export const skillsHandler = createSkillsHandler({
  reader: contentReader,
  repositories: repositoryStore,
  platformRoots: [
    path.resolve(process.cwd(), "../../packages/api"),
    path.resolve(process.cwd(), "../../doc-example/.agents"),
  ],
})
