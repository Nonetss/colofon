import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { CONFIG_FILE } from "#contract/load"
import { contentPathProblem } from "#git/content-root"
import { redactCredentials, spawnGit } from "#git/source"

// The folders of a repository that can be read as a site: the ones holding a
// doc.config.yaml. Only the tree of one ref is read, never file contents, so
// a form can offer them while the user types.

const GIT_TIMEOUT_MS = 60_000

/** The most folders a listing returns. */
export const MAX_CONTENT_FOLDERS = 50

export type ContentFolders =
  | { ok: true; folders: string[] }
  | { ok: false; error: string }

export type ContentFoldersOptions = {
  /** Branch, tag or commit to read; the remote's HEAD when left out. */
  ref?: string | undefined
  /** `source` is a bare repository on disk: read it in place, fetch nothing. */
  bare?: boolean | undefined
  /** Allow only the https transport, for a remote a user typed. */
  httpsOnly?: boolean | undefined
  timeoutMs?: number | undefined
}

/** The folders of the tree `paths` (repository-relative) that hold the config. */
export function foldersHoldingConfig(paths: string[]): string[] {
  const folders = new Set<string>()
  for (const file of paths) {
    if (path.posix.basename(file) !== CONFIG_FILE) continue
    const folder = path.posix.dirname(file)
    const content = folder === "." ? "" : folder
    if (contentPathProblem(content) === undefined) folders.add(content)
  }
  return [...folders]
    .toSorted((a, b) => {
      if (a === "") return -1
      if (b === "") return 1
      return a.localeCompare(b)
    })
    .slice(0, MAX_CONTENT_FOLDERS)
}

function treeEnv(httpsOnly: boolean | undefined) {
  const env: Record<string, string | undefined> = {
    ...process.env,
    GIT_TERMINAL_PROMPT: "0",
  }
  if (httpsOnly === true) env.GIT_ALLOW_PROTOCOL = "https"
  return env
}

/** The paths of the files of the tree `ref` of the repository `gitDir`. */
async function treePaths(
  gitDir: string,
  cwd: string,
  ref: string,
  env: Record<string, string | undefined>,
  timeoutMs: number
): Promise<string[]> {
  const output = await spawnGit(
    [`--git-dir=${gitDir}`, "ls-tree", "-r", "-z", "--name-only", ref],
    { cwd, env, timeoutMs }
  )
  return output.split("\0").filter((entry) => entry !== "")
}

/** A bare repository nothing was pushed to yet has no folders, not an error. */
async function bareFolders(
  folder: string,
  ref: string,
  timeoutMs: number
): Promise<ContentFolders> {
  const env = treeEnv(false)
  try {
    await spawnGit(
      [`--git-dir=${folder}`, "rev-parse", "--verify", "--quiet", ref],
      { cwd: tmpdir(), env, timeoutMs }
    )
  } catch {
    return { ok: true, folders: [] }
  }
  const paths = await treePaths(folder, tmpdir(), ref, env, timeoutMs)
  return { ok: true, folders: foldersHoldingConfig(paths) }
}

async function fetchedTree(
  source: string,
  ref: string | undefined,
  options: ContentFoldersOptions,
  scratch: string
): Promise<string[]> {
  const { timeoutMs = GIT_TIMEOUT_MS, httpsOnly } = options
  const gitDir = scratch
  const env = treeEnv(httpsOnly)
  const run = (args: string[]) =>
    spawnGit([`--git-dir=${gitDir}`, ...args], {
      cwd: scratch,
      env,
      timeoutMs,
    })
  await spawnGit(["init", "--quiet", "--bare", gitDir], {
    cwd: scratch,
    env,
    timeoutMs,
  })
  // Only the commit's tree travels: no history and no file contents.
  await run([
    "fetch",
    "--quiet",
    "--depth=1",
    "--filter=blob:none",
    source,
    ref ?? "HEAD",
  ])
  return treePaths(gitDir, scratch, "FETCH_HEAD", env, timeoutMs)
}

/**
 * The content folders of the git repository at `source` (a remote URL, or a
 * bare repository's folder with `bare`) at `ref`: the root as `""` when it
 * holds a `doc.config.yaml`, then each other folder that does, in order.
 * Errors come back without the URL's credentials.
 */
export async function listContentFolders(
  source: string,
  options: ContentFoldersOptions = {}
): Promise<ContentFolders> {
  const { ref, bare = false, timeoutMs = GIT_TIMEOUT_MS } = options
  try {
    if (bare) return await bareFolders(source, ref ?? "HEAD", timeoutMs)
    const scratch = await mkdtemp(path.join(tmpdir(), "content-folders-"))
    try {
      const paths = await fetchedTree(source, ref, options, scratch)
      return { ok: true, folders: foldersHoldingConfig(paths) }
    } finally {
      await rm(scratch, { recursive: true, force: true })
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { ok: false, error: redactCredentials(message, source) }
  }
}
