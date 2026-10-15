import {
  createGitHttpHandler,
  ensureBareRepo,
  type GitHttpHandler,
  hostedFolder,
} from "@nonete/content"
import type { Logger } from "pino"
import type {
  ContentReader,
  RepositoryStore,
  StoredRepository,
} from "#v1/content/reader"

// Content repositories hosted by the platform itself. A hosted repository
// stores its own git path, `/git/<slug>.git`, as its URL: the marker is the
// same in every environment, and `gitSourceOf` turns it into the bare
// repository on disk wherever git needs a source.

/** Public path the git endpoint hangs from. */
export const GIT_PATH = "/git"

/** The URL a hosted repository stores: its git path on the platform. */
export function hostedMarkerOf(slug: string): string {
  return `${GIT_PATH}/${slug}.git`
}

/** Whether `repository` is hosted by the platform. */
export function isHosted(repository: Pick<StoredRepository, "slug" | "url">) {
  return repository.url === hostedMarkerOf(repository.slug)
}

/**
 * What git reads `repository` from: its bare repository under `hostedRoot`
 * when it is hosted, its URL otherwise.
 */
export function gitSourceOf(
  repository: StoredRepository,
  hostedRoot: string
): string {
  if (!isHosted(repository)) return repository.url
  return hostedFolder(hostedRoot, repository.id)
}

/** Creates the bare repository of a hosted `repository` if it is missing. */
export async function ensureHostedRepo(
  repository: StoredRepository,
  hostedRoot: string
): Promise<string> {
  const folder = hostedFolder(hostedRoot, repository.id)
  await ensureBareRepo(folder, repository.ref)
  return folder
}

export type GitHostingOptions = {
  hostedRoot: string
  repositories: Pick<RepositoryStore, "find">
  reader: Pick<ContentReader, "syncInBackground">
  logger: Pick<Logger, "warn">
}

/**
 * The git endpoint for the hosted repositories: only a stored, hosted
 * repository is served, its bare repository is created when missing, and a
 * push starts its sync.
 */
export function createGitHosting(options: GitHostingOptions): GitHttpHandler {
  const { hostedRoot, repositories, reader, logger } = options

  async function hostedNamed(slug: string) {
    const repository = await repositories.find(slug)
    if (repository === undefined || !isHosted(repository)) return undefined
    return repository
  }

  return createGitHttpHandler({
    resolve: async (slug) => {
      const repository = await hostedNamed(slug)
      if (repository === undefined) return undefined
      return ensureHostedRepo(repository, hostedRoot)
    },
    onPush: (slug) => {
      hostedNamed(slug).then(
        (repository) => {
          if (repository !== undefined) reader.syncInBackground(repository)
        },
        (error: unknown) => {
          logger.warn({ slug, err: error }, "Could not sync after a git push")
        }
      )
    },
    onError: (slug, message) => {
      logger.warn({ slug, error: message }, "Git service failed")
    },
  })
}
