import { skipToken } from "@tanstack/react-query"
import type {
  CreateOwnRepositoryInput,
  OwnRepository,
  UpdateOwnRepositoryInput,
} from "@/features/profile/repositories/model/types"

/** The repository form's fields, trimmed. */
export type OwnRepositoryFormValues = {
  name: string
  url: string
  ref: string
}

/** What a create sends. */
export function createInput(
  slug: string,
  values: OwnRepositoryFormValues
): CreateOwnRepositoryInput {
  return { slug, name: values.name, url: values.url, ref: values.ref }
}

/**
 * What an edit sends: only the fields that changed. An empty URL keeps the
 * stored one, token included, since the list only shows it masked.
 */
export function updateInput(
  repository: OwnRepository,
  values: OwnRepositoryFormValues
): UpdateOwnRepositoryInput {
  return {
    slug: repository.slug,
    ...(values.name !== repository.name && { name: values.name }),
    ...(values.url !== "" && { url: values.url }),
    ...(values.ref !== repository.ref && { ref: values.ref }),
  }
}

/** What `listMyBranches` reads: a typed URL or one of the user's own. */
export type OwnBranchesSource = { url: string } | { slug: string }

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:"
  } catch {
    return false
  }
}

/**
 * Where the form reads the branches from: the URL being typed once it is a
 * complete https URL; while editing with the URL left empty, the stored
 * repository (whose URL, token included, the client never sees).
 */
export function ownBranchesSource(
  open: boolean,
  repository: OwnRepository | null,
  url: string
): OwnBranchesSource | typeof skipToken {
  if (!open) return skipToken
  if (isHttpsUrl(url)) return { url }
  if (repository !== null && url === "") return { slug: repository.slug }
  return skipToken
}

/** How many more repositories the user may add. */
export function remainingOf(used: number, limit: number): number {
  return Math.max(limit - used, 0)
}
