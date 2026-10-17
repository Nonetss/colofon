import type {
  ContentRepository,
  CreateRepositoryInput,
  RepositorySource,
  UpdateRepositoryInput,
} from "@/features/admin/content/model/types"

/** The repository form's fields, trimmed. */
export type RepositoryFormValues = {
  source: RepositorySource
  name: string
  url: string
  ref: string
  /** The content folder of the git repository; empty is its root. */
  path: string
}

/** The source the form starts with: the edited repository's, else a URL. */
export function initialSource(
  repository: ContentRepository | null
): RepositorySource {
  if (repository?.hosted === true) return "hosted"
  return "url"
}

/**
 * Whether the URL field must be filled: on a URL source, unless editing a
 * repository that already reads from a URL (empty keeps the stored one).
 */
export function urlRequired(
  repository: ContentRepository | null,
  source: RepositorySource
): boolean {
  if (source === "hosted") return false
  if (repository === null) return true
  return repository.hosted
}

/** What a create sends: the URL, or `hosted` instead of one. */
export function createInput(
  slug: string,
  values: RepositoryFormValues
): CreateRepositoryInput {
  const fields = {
    slug,
    name: values.name,
    ref: values.ref,
    path: values.path,
  }
  if (values.source === "hosted") return { ...fields, hosted: true }
  return { ...fields, url: values.url }
}

/**
 * What an edit sends: only the fields that changed. An empty URL keeps the
 * stored one, credentials included, since the list only shows it masked;
 * `hosted` is sent only to make an external repository hosted.
 */
export function updateInput(
  repository: ContentRepository,
  values: RepositoryFormValues
): UpdateRepositoryInput {
  return {
    slug: repository.slug,
    ...(values.name !== repository.name && { name: values.name }),
    ...sourceChange(repository, values),
    ...(values.ref !== repository.ref && { ref: values.ref }),
    ...(values.path !== repository.path && { path: values.path }),
  }
}

function sourceChange(
  repository: ContentRepository,
  values: RepositoryFormValues
): { url?: string; hosted?: true } {
  if (values.source === "hosted") {
    if (repository.hosted) return {}
    return { hosted: true }
  }
  if (values.url === "") return {}
  return { url: values.url }
}
