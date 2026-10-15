import { rm, stat } from "node:fs/promises"
import {
  type ContentDeclarations,
  cloneFolder,
  createRepoSync,
  describeRepository,
  loadContent,
  pruneClones,
  redactCredentials,
  type SyncResult,
} from "@nonete/content"
import type { Logger } from "pino"

// Reads the content repositories' declarations for the content feature. Each
// repository is a row (looked up through `repositories`, so tests need no
// database) and a clone in its own folder under `cloneRoot`, which `sync`
// refreshes. A clone is read in place on every request.

/** What the reader needs from a stored content repository. */
export type StoredRepository = {
  id: string
  slug: string
  url: string
  ref: string
}

/** Where the reader finds the repositories and records their syncs. */
export type RepositoryStore = {
  find: (slug: string) => Promise<StoredRepository | undefined>
  list: () => Promise<StoredRepository[]>
  recordSync: (id: string, result: SyncResult) => Promise<void>
}

export type ContentReaderOptions = {
  cloneRoot: string
  repositories: RepositoryStore
  logger: Pick<Logger, "info" | "warn">
}

/** A repository and its declarations, `undefined` without valid content. */
export type RepositoryContent = {
  repository: StoredRepository
  declarations: ContentDeclarations | undefined
}

export type RepositorySyncOutcome = {
  repository: StoredRepository
  result: SyncResult
}

export type ContentReader = {
  /**
   * The repository with `slug` and its current declarations, the last valid
   * ones when its content is now invalid; `undefined` for an unknown slug.
   */
  content: (slug: string) => Promise<RepositoryContent | undefined>
  /** Brings the repository's clone to its ref and records the outcome. */
  sync: (repository: StoredRepository) => Promise<SyncResult>
  /**
   * Syncs every stored repository, one after another, so one failure never
   * stops the rest; then removes the clones of repositories that no longer
   * exist.
   */
  syncAll: () => Promise<RepositorySyncOutcome[]>
  /**
   * Starts `sync` without waiting for it; a failure is logged, never thrown.
   */
  syncInBackground: (repository: StoredRepository) => void
  /** Removes a deleted repository's clone. */
  remove: (repository: StoredRepository) => Promise<void>
}

type RepoSync = { key: string; run: () => Promise<SyncResult> }

export function createContentReader(
  options: ContentReaderOptions
): ContentReader {
  const { cloneRoot, repositories, logger } = options
  const lastValid = new Map<string, ContentDeclarations>()
  const reportedProblems = new Map<string, string>()
  // One sync per clone folder, replaced when the URL or ref changes.
  const repoSyncs = new Map<string, RepoSync>()

  async function content(slug: string) {
    const repository = await repositories.find(slug)
    if (repository === undefined) return undefined
    return { repository, declarations: await declarationsOf(repository) }
  }

  async function declarationsOf(repository: StoredRepository) {
    const folder = cloneFolder(cloneRoot, repository.id)
    // Not cloned yet: nothing to read and nothing to report.
    if (!(await isFolder(folder))) return lastValid.get(folder)
    const result = await loadContent(folder)
    if (result.ok) {
      lastValid.set(folder, result.content)
      reportedProblems.delete(folder)
      return result.content
    }
    // Logged once per distinct list: the editor asks on every keystroke.
    const signature = JSON.stringify(result.problems)
    if (reportedProblems.get(folder) !== signature) {
      reportedProblems.set(folder, signature)
      logger.warn(
        {
          source: describeRepository(repository),
          problems: result.problems,
        },
        "Content is invalid; serving the last valid declarations"
      )
    }
    return lastValid.get(folder)
  }

  async function sync(repository: StoredRepository) {
    const result = await repoSyncFor(repository).run()
    if (result.ok) {
      logger.info(
        { source: describeRepository(repository), commit: result.commit },
        "Content repository synced"
      )
    } else {
      logger.warn(
        { source: describeRepository(repository), error: result.error },
        "Content repository sync failed; keeping the last checkout"
      )
    }
    await repositories.recordSync(repository.id, result)
    return result
  }

  function repoSyncFor(repository: StoredRepository) {
    const root = cloneFolder(cloneRoot, repository.id)
    const key = JSON.stringify([repository.url, repository.ref])
    const existing = repoSyncs.get(root)
    if (existing !== undefined && existing.key === key) return existing
    const created = {
      key,
      run: createRepoSync({ url: repository.url, ref: repository.ref, root }),
    }
    repoSyncs.set(root, created)
    return created
  }

  async function syncAll() {
    const stored = await repositories.list()
    const outcomes: RepositorySyncOutcome[] = []
    for (const repository of stored) {
      outcomes.push({ repository, result: await syncIsolated(repository) })
    }
    const removed = await pruneClones(
      cloneRoot,
      stored.map((repository) => repository.id)
    )
    for (const entry of removed) forget(entry)
    if (removed.length > 0) {
      logger.info({ removed }, "Removed clones of deleted content repositories")
    }
    return outcomes
  }

  // `sync` reports git failures as results; this also catches a failure to
  // record one, so the next repository still gets its turn.
  async function syncIsolated(
    repository: StoredRepository
  ): Promise<SyncResult> {
    try {
      return await sync(repository)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const redacted = redactCredentials(message, repository.url)
      logger.warn(
        { source: describeRepository(repository), error: redacted },
        "Content repository sync failed"
      )
      return { ok: false, error: redacted }
    }
  }

  function forget(id: string) {
    const folder = cloneFolder(cloneRoot, id)
    lastValid.delete(folder)
    reportedProblems.delete(folder)
    repoSyncs.delete(folder)
  }

  async function remove(repository: StoredRepository) {
    await rm(cloneFolder(cloneRoot, repository.id), {
      recursive: true,
      force: true,
    })
    forget(repository.id)
  }

  function syncInBackground(repository: StoredRepository) {
    void syncIsolated(repository)
  }

  return { content, sync, syncAll, syncInBackground, remove }
}

async function isFolder(folder: string): Promise<boolean> {
  try {
    return (await stat(folder)).isDirectory()
  } catch {
    return false
  }
}
