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
  /** The content folder of the git repository; empty is its root. */
  path: string
  /** The saved login: `null` removes it, `undefined` leaves it. */
  credentialId?: string | null
}

/** What a create sends. */
export function createInput(
  slug: string,
  values: OwnRepositoryFormValues
): CreateOwnRepositoryInput {
  return {
    slug,
    name: values.name,
    url: values.url,
    ref: values.ref,
    path: values.path,
    ...(typeof values.credentialId === "string" && {
      credentialId: values.credentialId,
    }),
  }
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
    ...(values.path !== repository.path && { path: values.path }),
    ...(values.credentialId !== undefined &&
      values.credentialId !== repository.credentialId && {
        credentialId: values.credentialId,
      }),
  }
}

/** What `listMyBranches` reads: a typed URL or one of the user's own. */
export type OwnBranchesSource =
  | { url: string; credentialId?: string }
  | { slug: string }

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
  url: string,
  credentialId?: string
): OwnBranchesSource | typeof skipToken {
  if (!open) return skipToken
  if (isHttpsUrl(url)) {
    if (credentialId === undefined) return { url }
    return { url, credentialId }
  }
  if (repository !== null && url === "") return { slug: repository.slug }
  return skipToken
}
