import { skipToken } from "@tanstack/react-query"
import type { ContentRepository } from "@/features/admin/content/model/types"

/** What `listBranches` reads: a typed URL or a stored repository. */
export type BranchesSource = { url: string } | { slug: string }

function isHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value)
    return protocol === "https:" || protocol === "http:"
  } catch {
    return false
  }
}

/**
 * Where the form reads the branches from: the URL being typed once it is a
 * complete http(s) URL; while editing with the URL left empty, the stored
 * repository (whose URL, credentials included, the client never sees);
 * otherwise nothing yet.
 */
export function branchesSource(
  open: boolean,
  repository: ContentRepository | null,
  url: string
): BranchesSource | typeof skipToken {
  if (!open) return skipToken
  if (isHttpUrl(url)) return { url }
  if (repository !== null && url === "") return { slug: repository.slug }
  return skipToken
}

/**
 * The options of the ref select: the remote's branches, plus the current
 * ref when it is not one of them (a tag or a commit typed before).
 */
export function refOptions(branches: string[], current: string): string[] {
  if (current === "" || branches.includes(current)) return branches
  return [current, ...branches]
}

/**
 * The branch to preselect: the one the remote's HEAD points at, or the first
 * branch when HEAD points at none; `undefined` without branches.
 */
export function suggestedBranch(listing: {
  branches: string[]
  defaultBranch: string | null
}): string | undefined {
  if (listing.defaultBranch !== null) return listing.defaultBranch
  return listing.branches[0]
}
