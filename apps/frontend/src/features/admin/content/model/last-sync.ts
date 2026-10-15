import type { ContentRepository } from "@/features/admin/content/model/types"

const SHORT_COMMIT_LENGTH = 7

/** The outcome of a repository's last sync, as the card shows it. */
export type LastSync =
  | { state: "never" }
  | { state: "failed"; at: string; error: string }
  | { state: "ok"; at: string; commit: string | null }

export function lastSyncOf(repository: ContentRepository): LastSync {
  if (repository.lastSyncedAt === null) return { state: "never" }
  if (repository.lastSyncError !== null) {
    return {
      state: "failed",
      at: repository.lastSyncedAt,
      error: repository.lastSyncError,
    }
  }
  return {
    state: "ok",
    at: repository.lastSyncedAt,
    commit: shortCommit(repository.lastCommit),
  }
}

/** A commit hash cut to its usual short form. */
export function shortCommit(commit: string | null): string | null {
  if (commit === null) return null
  return commit.slice(0, SHORT_COMMIT_LENGTH)
}
