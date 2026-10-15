import { mkdir, readdir, rm } from "node:fs/promises"
import path from "node:path"

// Where the content comes from: a local folder (CONTENT_DIR) read in place,
// or a git repository (CONTENT_REPO at CONTENT_REF) kept in a clone folder
// with the git CLI. Credentials only travel inside the repository URL and
// are redacted from everything this module reports.

/** Folder, under the repo root, where a CONTENT_REPO clone is kept. */
export const CLONE_DIR = ".content"

const GIT_TIMEOUT_MS = 60_000

export type ContentSource =
  | { kind: "none" }
  | { kind: "dir"; root: string }
  | { kind: "repo"; url: string; ref: string; root: string }

export type ContentSourceOptions = {
  dir?: string | undefined
  repo?: string | undefined
  ref: string
  /** The repo root: a relative `dir` and the clone folder hang from it. */
  repoRoot: string
}

/** The content source the options describe; `dir` wins over nothing else. */
export function resolveContentSource(
  options: ContentSourceOptions
): ContentSource {
  if (options.dir !== undefined) {
    return { kind: "dir", root: path.resolve(options.repoRoot, options.dir) }
  }
  if (options.repo !== undefined) {
    return {
      kind: "repo",
      url: options.repo,
      ref: options.ref,
      root: path.join(options.repoRoot, CLONE_DIR),
    }
  }
  return { kind: "none" }
}

/** A line describing `source` for the logs, without credentials. */
export function describeSource(source: ContentSource): string {
  if (source.kind === "none") return "no content source configured"
  if (source.kind === "dir") return `content folder ${source.root}`
  return `content repository ${publicUrl(source.url)} at ${source.ref}`
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
    await git(["fetch", "--quiet", "--depth", "1", "origin", options.ref])
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
 * Runs git on the clone only. GIT_DIR and GIT_WORK_TREE pin it to `root`:
 * without them git would look for a repository in the parent folders and,
 * in native dev, find this platform's own checkout around `.content/`.
 */
function gitRunner(options: RepoSyncOptions): Git {
  const { timeoutMs = GIT_TIMEOUT_MS } = options
  const env = {
    ...process.env,
    GIT_DIR: path.join(options.root, ".git"),
    GIT_WORK_TREE: options.root,
    GIT_TERMINAL_PROMPT: "0",
  }
  return async (args) => {
    const child = Bun.spawn(["git", ...args], {
      cwd: options.root,
      env,
      stdout: "pipe",
      stderr: "pipe",
      signal: AbortSignal.timeout(timeoutMs),
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
