import { skipToken } from "@tanstack/react-query"
import type {
  ContentRepository,
  RepositorySource,
} from "@/features/admin/content/model/types"

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
 * Where the form reads the branches from. For a URL source: the URL being
 * typed once it is a complete http(s) URL; while editing an external
 * repository with the URL left empty, the stored repository (whose URL,
 * credentials included, the client never sees). For a hosted source: the
 * stored repository when it is already hosted, since a new one has no
 * branches until the first push. Otherwise nothing yet.
 */
export function branchesSource(
  open: boolean,
  repository: ContentRepository | null,
  source: RepositorySource,
  url: string
): BranchesSource | typeof skipToken {
  if (!open) return skipToken
  if (source === "hosted") {
    if (repository?.hosted === true) return { slug: repository.slug }
    return skipToken
  }
  if (isHttpUrl(url)) return { url }
  if (repository !== null && !repository.hosted && url === "") {
    return { slug: repository.slug }
  }
  return skipToken
}
