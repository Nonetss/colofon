import { skipToken } from "@tanstack/react-query"

/** The select's value for the repository root, whose path is empty. */
export const ROOT_VALUE = "."

export const ROOT_LABEL = "Raíz del repositorio"

export type PathOption = { value: string; label: string }

/** The select value of a content path. */
export function toSelectValue(path: string): string {
  if (path === "") return ROOT_VALUE
  return path
}

/** The content path of a select value. */
export function fromSelectValue(value: string): string {
  if (value === ROOT_VALUE) return ""
  return value
}

/**
 * The options of the folder select: the folders found plus the current path
 * when it isn't one of them (a folder typed before), the root labelled.
 */
export function pathOptions(folders: string[], current: string): PathOption[] {
  const paths = folders.includes(current) ? folders : [current, ...folders]
  return paths.map((path) => ({
    value: toSelectValue(path),
    label: labelOf(path),
  }))
}

function labelOf(path: string): string {
  if (path === "") return ROOT_LABEL
  return path
}

/** A repository to read, as the branches procedures take it. */
export type FoldersSource = { url: string } | { slug: string }

/**
 * What the folders procedures read: the repository a form already points at
 * and the ref chosen in it (the remote's HEAD while the ref is empty), or
 * nothing while the form can't tell the repository yet.
 */
export function foldersInput(
  source: FoldersSource | typeof skipToken,
  ref: string
): (FoldersSource & { ref?: string }) | typeof skipToken {
  if (source === skipToken) return skipToken
  const trimmed = ref.trim()
  if (trimmed === "") return source
  return { ...source, ref: trimmed }
}
