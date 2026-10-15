import {
  type ContentDeclarations,
  type ContentSource,
  createRepoSync,
  describeSource,
  loadContent,
  type SyncResult,
} from "@nonete/content"
import type { Logger } from "pino"

// Reads the content repository's declarations for the content feature. The
// source is asked for on every call, so a changed environment (or a test)
// takes effect at once. A folder is read in place on every request; a
// repository is read from its clone, which `sync` refreshes.

export type ContentReaderOptions = {
  source: () => ContentSource
  logger: Pick<Logger, "info" | "warn">
}

export type ContentReader = {
  /** The source currently configured. */
  source: () => ContentSource
  /**
   * The current declarations, the last valid ones when the content is now
   * invalid, or `undefined` without a source or valid content.
   */
  declarations: () => Promise<ContentDeclarations | undefined>
  /** Refreshes a repository clone; `undefined` for any other source. */
  sync: () => Promise<SyncResult | undefined>
}

export function createContentReader(
  options: ContentReaderOptions
): ContentReader {
  const lastValid = new Map<string, ContentDeclarations>()
  const reportedProblems = new Map<string, string>()
  const repoSyncs = new Map<string, () => Promise<SyncResult>>()

  async function declarations() {
    const source = options.source()
    if (source.kind === "none") return undefined
    const result = await loadContent(source.root)
    if (result.ok) {
      lastValid.set(source.root, result.content)
      reportedProblems.delete(source.root)
      return result.content
    }
    // Logged once per distinct list: the editor asks on every keystroke.
    const signature = JSON.stringify(result.problems)
    if (reportedProblems.get(source.root) !== signature) {
      reportedProblems.set(source.root, signature)
      options.logger.warn(
        { source: describeSource(source), problems: result.problems },
        "Content is invalid; serving the last valid declarations"
      )
    }
    return lastValid.get(source.root)
  }

  async function sync() {
    const source = options.source()
    if (source.kind !== "repo") return undefined
    const result = await repoSyncFor(source)()
    if (result.ok) {
      options.logger.info(
        { source: describeSource(source), commit: result.commit },
        "Content repository synced"
      )
      return result
    }
    options.logger.warn(
      { source: describeSource(source), error: result.error },
      "Content repository sync failed; keeping the last checkout"
    )
    return result
  }

  function repoSyncFor(source: Extract<ContentSource, { kind: "repo" }>) {
    const key = JSON.stringify([source.url, source.ref, source.root])
    const existing = repoSyncs.get(key)
    if (existing !== undefined) return existing
    const created = createRepoSync(source)
    repoSyncs.set(key, created)
    return created
  }

  return { source: options.source, declarations, sync }
}
