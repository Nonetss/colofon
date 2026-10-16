import { mkdir, readdir, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { CATALOG_DIR, DOCS_DIR } from "#contract/load"

// Where the content comes from: git repositories, each kept in its own clone
// folder under one clone root with the git CLI. Credentials only travel
// inside the repository URL and are redacted from everything this module
// reports.

/** Folder, under the repo root, holding one clone per content repository. */
export const CLONE_DIR = ".content"

const GIT_TIMEOUT_MS = 60_000

/** What this module needs to know about a content repository. */
export type RepositorySource = {
  slug: string
  url: string
  ref: string
}

/** The folder of the clone of the repository with `id`, under `cloneRoot`. */
export function cloneFolder(cloneRoot: string, id: string): string {
  return path.join(cloneRoot, id)
}

/**
 * Removes every entry of `cloneRoot` that is not the clone folder of one of
 * `keepIds`, and returns their names. A missing root has nothing to remove.
 * The root may be a mount point, so it is never removed itself.
 */
export async function pruneClones(
  cloneRoot: string,
  keepIds: Iterable<string>
): Promise<string[]> {
  const keep = new Set(keepIds)
  const stale = (await entriesOf(cloneRoot)).filter((entry) => !keep.has(entry))
  for (const entry of stale) {
    await rm(path.join(cloneRoot, entry), { recursive: true, force: true })
  }
  return stale
}

async function entriesOf(folder: string): Promise<string[]> {
  try {
    return await readdir(folder)
  } catch {
    return []
  }
}

/** A line describing `repository` for the logs, without credentials. */
export function describeRepository(repository: RepositorySource): string {
  return `content repository ${repository.slug} (${publicUrl(repository.url)}) at ${repository.ref}`
}

/** `url` with its user and password, if any, replaced by `***`. */
export function publicUrl(url: string): string {
  const parsed = parseUrl(url)
  if (parsed === undefined) return url
  if (parsed.username === "" && parsed.password === "") return url
  parsed.username = "***"
  parsed.password = ""
  return parsed.href
}

/** `text` with every credential of `url` replaced by `***`. */
export function redactCredentials(text: string, url: string): string {
  return credentialsOf(url).reduce(
    (redacted, secret) => redacted.split(secret).join("***"),
    text
  )
}

function credentialsOf(url: string): string[] {
  const parsed = parseUrl(url)
  if (parsed === undefined) return []
  const secrets: string[] = []
  for (const part of [parsed.password, parsed.username]) {
    if (part === "") continue
    secrets.push(part, decodeURIComponent(part))
  }
  return secrets
}

function parseUrl(url: string): URL | undefined {
  try {
    return new URL(url)
  } catch {
    return undefined
  }
}

export type SyncResult =
  | { ok: true; commit: string }
  | { ok: false; error: string }

export type RepoSyncOptions = {
  url: string
  ref: string
  /** The clone folder; may be a mount point, so it is emptied, never removed. */
  root: string
  timeoutMs?: number | undefined
}

/**
 * A function that brings the clone at `root` to `ref` of `url`, exactly as
 * the remote has it. A call made while a sync runs gets that same sync.
 */
export function createRepoSync(
  options: RepoSyncOptions
): () => Promise<SyncResult> {
  let running: Promise<SyncResult> | undefined
  return () => {
    if (running !== undefined) return running
    running = syncRepo(options).finally(() => {
      running = undefined
    })
    return running
  }
}

async function syncRepo(options: RepoSyncOptions): Promise<SyncResult> {
  const git = gitRunner(options)
  try {
    await mkdir(options.root, { recursive: true })
    if ((await originOf(git)) !== options.url) {
      await emptyFolder(options.root)
      await git(["init", "--quiet"])
      await git(["remote", "add", "origin", options.url])
    }
    await git(await fetchArgs(git, options.ref))
    await git(["checkout", "--quiet", "--force", "--detach", "FETCH_HEAD"])
    await git(["clean", "--quiet", "-ffdx"])
    const commit = await git(["rev-parse", "HEAD"])
    return { ok: true, commit: commit.trim() }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { ok: false, error: redactCredentials(message, options.url) }
  }
}

type Git = (args: string[]) => Promise<string>

/**
 * Fetches the full history of `ref`, which the last edit dates need. A clone
 * left shallow by an earlier `--depth 1` fetch is deepened.
 */
async function fetchArgs(git: Git, ref: string): Promise<string[]> {
  const shallow = await git(["rev-parse", "--is-shallow-repository"])
  if (shallow.trim() === "true") {
    return ["fetch", "--quiet", "--unshallow", "origin", ref]
  }
  return ["fetch", "--quiet", "origin", ref]
}

/** Separates the commits in the output of `readEditDates`' log. */
const COMMIT_MARK = "\u0001"

/**
 * The date (`YYYY-MM-DD`, the committer's) of the last commit that touched
 * each file under `docs/` and `catalog/` of the checkout at `root`, keyed
 * by its path relative to `root`. One `git log` pass over the history.
 */
export async function readEditDates(
  root: string,
  timeoutMs = GIT_TIMEOUT_MS
): Promise<ReadonlyMap<string, string>> {
  const git = gitRunner({ root, timeoutMs })
  const log = await git([
    "-c",
    "core.quotePath=false",
    "log",
    "--format=format:%x01%cs",
    "--name-only",
    "HEAD",
    "--",
    DOCS_DIR,
    CATALOG_DIR,
  ])
  const dates = new Map<string, string>()
  for (const chunk of log.split(COMMIT_MARK)) {
    const [date, ...files] = chunk.split("\n")
    if (date === undefined || date === "") continue
    for (const file of files) {
      if (file !== "" && !dates.has(file)) dates.set(file, date)
    }
  }
  return dates
}

/**
 * Runs git on the clone only. GIT_DIR and GIT_WORK_TREE pin it to `root`:
 * without them git would look for a repository in the parent folders and,
 * in native dev, find this platform's own checkout around `.content/`.
 */
function gitRunner(options: {
  root: string
  timeoutMs?: number | undefined
}): Git {
  const { timeoutMs = GIT_TIMEOUT_MS } = options
  const env = {
    ...process.env,
    GIT_DIR: path.join(options.root, ".git"),
    GIT_WORK_TREE: options.root,
    GIT_TERMINAL_PROMPT: "0",
  }
  return (args) => spawnGit(args, { cwd: options.root, env, timeoutMs })
}

export type SpawnGitOptions = {
  cwd: string
  env: Record<string, string | undefined>
  timeoutMs: number
}

/** Runs git and returns its stdout, throwing with its stderr on failure. */
export async function spawnGit(
  args: string[],
  options: SpawnGitOptions
): Promise<string> {
  const child = Bun.spawn(["git", ...args], {
    cwd: options.cwd,
    env: options.env,
    stdout: "pipe",
    stderr: "pipe",
    signal: AbortSignal.timeout(options.timeoutMs),
  })
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ])
  if (exitCode !== 0) {
    throw new Error(`git ${args[0]} failed: ${stderr.trim()}`)
  }
  return stdout
}

async function originOf(git: Git): Promise<string | undefined> {
  try {
    return (await git(["remote", "get-url", "origin"])).trim()
  } catch {
    return undefined
  }
}

async function emptyFolder(root: string) {
  for (const entry of await readdir(root)) {
    await rm(path.join(root, entry), { recursive: true, force: true })
  }
}

export type RemoteBranches =
  | { ok: true; branches: string[]; defaultBranch: string | null }
  | { ok: false; error: string }

const BRANCH_PREFIX = "refs/heads/"
const SYMREF_PREFIX = `ref: ${BRANCH_PREFIX}`

/**
 * The branches of the git repository at `url`, sorted by name, and the one
 * its HEAD points at, read with `git ls-remote` and nothing cloned. Errors
 * come back without the URL's credentials.
 */
export async function listRemoteBranches(
  url: string,
  timeoutMs: number = GIT_TIMEOUT_MS
): Promise<RemoteBranches> {
  try {
    // Outside any checkout, so git never reads this platform's own repo.
    const output = await spawnGit(
      ["ls-remote", "--symref", url, "HEAD", `${BRANCH_PREFIX}*`],
      {
        cwd: tmpdir(),
        env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
        timeoutMs,
      }
    )
    return { ok: true, ...parseLsRemote(output) }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { ok: false, error: redactCredentials(message, url) }
  }
}

function parseLsRemote(output: string) {
  const branches: string[] = []
  let defaultBranch: string | null = null
  for (const line of output.split("\n")) {
    const [left, ref] = line.split("\t")
    if (left === undefined || ref === undefined) continue
    if (left.startsWith(SYMREF_PREFIX) && ref === "HEAD") {
      defaultBranch = left.slice(SYMREF_PREFIX.length)
    } else if (ref.startsWith(BRANCH_PREFIX)) {
      branches.push(ref.slice(BRANCH_PREFIX.length))
    }
  }
  return { branches: branches.toSorted(), defaultBranch }
}
