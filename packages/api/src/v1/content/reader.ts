import { rm, stat } from "node:fs/promises"
import {
  type ContentDeclarations,
  checkUserRemote,
  cloneFolder,
  createRepoSync,
  describeRepository,
  loadContent,
  pruneClones,
  type RemoteCheck,
  readCatalog,
  readEditDates,
  readSite,
  redactCredentials,
  type Site,
  type SiteRoutes,
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
  /** Display name, as the admin screen shows it. */
  name: string
  url: string
  ref: string
  /** The user it is private to; `null` for a platform repository. */
  ownerId: string | null
}

/**
 * Whose repositories a read may see: `platform` the ones without an owner,
 * `{ userId }` those and that user's own, `all` every one (syncs, git
 * hosting).
 */
export type RepositoryAudience = "all" | "platform" | { userId: string }

/** What a signed-in user reads; the platform's alone without a session. */
export function audienceOfUser(
  user: { id: string } | null
): RepositoryAudience {
  if (user === null) return "platform"
  return { userId: user.id }
}

/** Whether `repository` is within `audience`. */
export function isVisibleTo(
  repository: Pick<StoredRepository, "ownerId">,
  audience: RepositoryAudience
): boolean {
  if (audience === "all") return true
  if (repository.ownerId === null) return true
  if (audience === "platform") return false
  return repository.ownerId === audience.userId
}

/** Where the reader finds the repositories and records their syncs. */
export type RepositoryStore = {
  find: (
    slug: string,
    audience: RepositoryAudience
  ) => Promise<StoredRepository | undefined>
  list: (audience: RepositoryAudience) => Promise<StoredRepository[]>
  recordSync: (id: string, result: SyncResult) => Promise<void>
}

export type ContentReaderOptions = {
  cloneRoot: string
  repositories: RepositoryStore
  /** What git clones a repository from: its URL, or a hosted one's folder. */
  resolveSource: (repository: StoredRepository) => string
  logger: Pick<Logger, "info" | "warn">
  /**
   * Vets the URL of a user's repository before each of its syncs; tests
   * replace it so they need no network.
   */
  checkRemote?: (url: string) => Promise<RemoteCheck>
}

/** A repository and its declarations, `undefined` without valid content. */
export type RepositoryContent = {
  repository: StoredRepository
  declarations: ContentDeclarations | undefined
}

/** A repository's declarations and its pages, `undefined` without content. */
export type RepositorySite = {
  repository: StoredRepository
  declarations: ContentDeclarations | undefined
  site: Site | undefined
}

/** Where the reader's pages, links and images live for the repository `slug`. */
export function readerRoutesOf(slug: string): SiteRoutes {
  return {
    routeOf: (pagePath) => {
      if (pagePath === "") return `/${slug}`
      return `/${slug}/${pagePath}`
    },
    fileUrlOf: (docsPath) =>
      `/api/v1/docs/${slug}/files/${encodeURI(docsPath)}`,
  }
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
  content: (
    slug: string,
    audience: RepositoryAudience
  ) => Promise<RepositoryContent | undefined>
  /**
   * The repository with `slug`, its declarations and its pages, read once
   * per checkout: a successful sync or a removal drops them. `undefined` for
   * an unknown slug.
   */
  site: (
    slug: string,
    audience: RepositoryAudience
  ) => Promise<RepositorySite | undefined>
  /** The repository's clone folder, where its files are read. */
  folderOf: (repository: StoredRepository) => string
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
  const { cloneRoot, repositories, resolveSource, logger } = options
  const { checkRemote = checkUserRemote } = options
  const lastValid = new Map<string, ContentDeclarations>()
  const reportedProblems = new Map<string, string>()
  // One sync per clone folder, replaced when the URL or ref changes.
  const repoSyncs = new Map<string, RepoSync>()
  // The pages of each clone folder, built on first read after a sync.
  const sites = new Map<string, Promise<Site>>()

  async function content(slug: string, audience: RepositoryAudience) {
    const repository = await repositories.find(slug, audience)
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

  async function site(slug: string, audience: RepositoryAudience) {
    const repository = await repositories.find(slug, audience)
    if (repository === undefined) return undefined
    const declarations = await declarationsOf(repository)
    if (declarations === undefined)
      return { repository, declarations, site: undefined }
    return {
      repository,
      declarations,
      site: await siteOf(repository, declarations),
    }
  }

  function siteOf(
    repository: StoredRepository,
    declarations: ContentDeclarations
  ): Promise<Site> {
    const folder = cloneFolder(cloneRoot, repository.id)
    const cached = sites.get(folder)
    if (cached !== undefined) return cached
    const built = buildSite(repository, declarations, folder)
    sites.set(folder, built)
    // A failed build is not kept, so the next read tries again.
    built.catch(() => sites.delete(folder))
    return built
  }

  async function buildSite(
    repository: StoredRepository,
    declarations: ContentDeclarations,
    folder: string
  ): Promise<Site> {
    const [catalog, editDates] = await Promise.all([
      readCatalog(folder, declarations),
      editDatesOf(repository, folder),
    ])
    const catalogProblems = [...catalog.values()].flatMap(
      (type) => type.problems
    )
    if (catalogProblems.length > 0) {
      logger.warn(
        {
          source: describeRepository(repository),
          problems: catalogProblems,
        },
        "Catalog entities have problems"
      )
    }
    const built = await readSite(
      folder,
      declarations.config,
      declarations.index,
      catalog,
      readerRoutesOf(repository.slug),
      declarations.menu,
      editDates
    )
    if (built.problems.length > 0) {
      logger.warn(
        {
          source: describeRepository(repository),
          problems: built.problems,
        },
        "Content pages have problems"
      )
    }
    return built
  }

  /** The clone's last commit date per file; none when git can't tell. */
  async function editDatesOf(
    repository: StoredRepository,
    folder: string
  ): Promise<ReadonlyMap<string, string>> {
    try {
      return await readEditDates(folder)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.warn(
        {
          source: describeRepository(repository),
          error: redactCredentials(message, repository.url),
        },
        "Edit dates could not be read; pages have none"
      )
      return new Map()
    }
  }

  function folderOf(repository: StoredRepository) {
    return cloneFolder(cloneRoot, repository.id)
  }

  /** Runs the sync, after vetting the remote of a user's repository. */
  async function runSync(repository: StoredRepository): Promise<SyncResult> {
    if (repository.ownerId !== null) {
      const checked = await checkRemote(repository.url)
      if (!checked.ok) return { ok: false, error: checked.error }
    }
    return repoSyncFor(repository).run()
  }

  async function sync(repository: StoredRepository) {
    const result = await runSync(repository)
    if (result.ok) {
      sites.delete(cloneFolder(cloneRoot, repository.id))
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
      run: createRepoSync({
        url: resolveSource(repository),
        ref: repository.ref,
        root,
        httpsOnly: repository.ownerId !== null,
      }),
    }
    repoSyncs.set(root, created)
    return created
  }

  async function syncAll() {
    const stored = await repositories.list("all")
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
    sites.delete(folder)
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

  return {
    content,
    site,
    folderOf,
    sync,
    syncAll,
    syncInBackground,
    remove,
  }
}

async function isFolder(folder: string): Promise<boolean> {
  try {
    return (await stat(folder)).isDirectory()
  } catch {
    return false
  }
}
