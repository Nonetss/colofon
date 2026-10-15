import { ORPCError } from "@orpc/client"
import { skipToken } from "@tanstack/react-query"

/**
 * What the code screen shows of its repository, as kept in the page's URL:
 * a branch, a folder and, when one is open, a file. Empty means "not
 * chosen". The repository is the route itself.
 */
export type GitLocation = {
  branch: string
  path: string
  file: string
}

export const EMPTY_LOCATION: GitLocation = {
  branch: "",
  path: "",
  file: "",
}

const KEYS = ["branch", "path", "file"] as const

/** The location a query string (`?branch=…&path=…`) holds. */
export function parseLocation(search: string): GitLocation {
  const params = new URLSearchParams(search)
  return {
    branch: params.get("branch") ?? "",
    path: params.get("path") ?? "",
    file: params.get("file") ?? "",
  }
}

/** `href` with its query string replaced by `location`'s, empty values left out. */
export function hrefOf(href: string, location: GitLocation): string {
  const url = new URL(href)
  for (const key of KEYS) url.searchParams.delete(key)
  for (const key of KEYS) {
    if (location[key] !== "") url.searchParams.set(key, location[key])
  }
  return url.href
}

/**
 * The branch to start on: the repository's ref when it is a branch, else
 * the one its HEAD points at, else the first; `undefined` without branches.
 */
export function startingBranch(
  ref: string,
  listing: { branches: string[]; defaultBranch: string | null }
): string | undefined {
  if (listing.branches.includes(ref)) return ref
  if (listing.defaultBranch !== null) return listing.defaultBranch
  return listing.branches[0]
}

/** The branch shown: the URL's when the repository has it, else the start. */
export function shownBranch(
  wanted: string,
  ref: string,
  listing: { branches: string[]; defaultBranch: string | null }
): string | undefined {
  if (listing.branches.includes(wanted)) return wanted
  return startingBranch(ref, listing)
}

/** What a folder or file read asks for. */
export type RepositoryTarget = { slug: string; branch: string; path: string }

/** The branches to read: the shown repository's, once there is one. */
export function branchesInput(
  repository: { slug: string } | undefined
): { slug: string } | typeof skipToken {
  if (repository === undefined) return skipToken
  return { slug: repository.slug }
}

/** The hosted repository named `slug`, if there is one. */
export function repositoryNamed<T extends { slug: string }>(
  repositories: T[],
  slug: string
): T | undefined {
  return repositories.find((repository) => repository.slug === slug)
}

/** The folder to list: the location's, unless a file is open. */
export function folderInput(
  slug: string | undefined,
  branch: string | undefined,
  location: GitLocation
): RepositoryTarget | typeof skipToken {
  if (slug === undefined || branch === undefined) return skipToken
  if (location.file !== "") return skipToken
  return { slug, branch, path: location.path }
}

/** The file to read: the location's open file, if any. */
export function fileInput(
  slug: string | undefined,
  branch: string | undefined,
  location: GitLocation
): RepositoryTarget | typeof skipToken {
  if (slug === undefined || branch === undefined) return skipToken
  if (location.file === "") return skipToken
  return { slug, branch, path: location.file }
}

export type Crumb = {
  label: string
  /** The folder it opens, from the repository root; `""` for the root. */
  path: string
}

/** The trail from the repository root (named `rootLabel`) to `path`. */
export function breadcrumb(rootLabel: string, path: string): Crumb[] {
  const crumbs: Crumb[] = [{ label: rootLabel, path: "" }]
  if (path === "") return crumbs
  const segments = path.split("/")
  segments.forEach((label, index) => {
    crumbs.push({ label, path: segments.slice(0, index + 1).join("/") })
  })
  return crumbs
}

/** The folder holding `filePath`; `""` for a file at the root. */
export function parentFolder(filePath: string): string {
  const slash = filePath.lastIndexOf("/")
  if (slash === -1) return ""
  return filePath.slice(0, slash)
}

/**
 * The folders to unfold for the file tree to show `filePath`, from the root
 * down: `docs/red/a.md` → `docs`, `docs/red`.
 */
export function ancestorFolders(filePath: string): string[] {
  const segments = filePath.split("/").slice(0, -1)
  return segments.map((_, index) => segments.slice(0, index + 1).join("/"))
}

/**
 * The folders to unfold for the file tree to show a location: the folder it
 * names with the ones above it, and the ones above its open file.
 */
export function revealedFolders(location: {
  path: string
  file: string
}): string[] {
  const folders = new Set(ancestorFolders(location.file))
  if (location.path !== "") {
    for (const folder of ancestorFolders(location.path)) folders.add(folder)
    folders.add(location.path)
  }
  return [...folders]
}

/** `folders` with `path` folded if it was unfolded, unfolded if not. */
export function toggledFolder(
  folders: ReadonlySet<string>,
  path: string
): Set<string> {
  const next = new Set(folders)
  if (next.has(path)) next.delete(path)
  else next.add(path)
  return next
}

/** Whether `error` is the API's NOT_FOUND. */
export function isNotFound(error: unknown): boolean {
  return error instanceof ORPCError && error.code === "NOT_FOUND"
}

/** How many lines `content` shows: a final newline opens no new line. */
export function lineCount(content: string): number {
  if (content === "") return 0
  const breaks = content.split("\n").length - 1
  if (content.endsWith("\n")) return breaks
  return breaks + 1
}

/** `bytes` for people: `512 B`, `3,4 KB`, `1,2 MB`. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const kib = bytes / 1024
  if (kib < 1024) return `${decimal(kib)} KB`
  return `${decimal(kib / 1024)} MB`
}

function decimal(value: number): string {
  return value.toLocaleString("es-ES", { maximumFractionDigits: 1 })
}
