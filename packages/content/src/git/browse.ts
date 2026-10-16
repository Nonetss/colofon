import { tmpdir } from "node:os"
import { spawnGit } from "#git/source"

// Reads the folders and files of a bare repository on one of its branches
// with the git CLI, without checking anything out. Every object name starts
// with `refs/heads/`: only branches are read, and no argument can be taken
// for an option. Any git failure (unknown branch or path, wrong kind of
// object, no repository) is just "not there".

/** Files larger than this are reported, never read. */
export const MAX_FILE_BYTES = 512 * 1024

/** A NUL byte this early makes a file binary, as git itself decides. */
export const BINARY_SNIFF_BYTES = 8000

const GIT_TIMEOUT_MS = 10_000

export type FolderEntry = {
  name: string
  /** From the repository root, with `/` separators. */
  path: string
  kind: "folder" | "file" | "submodule"
  /** Bytes, for a file; `null` otherwise. */
  size: number | null
}

export type FolderResult = { ok: true; entries: FolderEntry[] } | { ok: false }

export type FileResult =
  | { ok: false }
  | { ok: true; size: number; kind: "text"; content: string }
  | { ok: true; size: number; kind: "binary" | "too-large" }

/** The object `path` (the root when empty) names on `branch`. */
function objectName(branch: string, path: string): string {
  return `refs/heads/${branch}:${path}`
}

/** Runs git and returns its stdout, `undefined` when it fails. */
async function git(
  folder: string,
  args: string[]
): Promise<string | undefined> {
  try {
    return await spawnGit([`--git-dir=${folder}`, ...args], {
      cwd: tmpdir(),
      env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
      timeoutMs: GIT_TIMEOUT_MS,
    })
  } catch {
    return undefined
  }
}

/** Runs git and returns its stdout as bytes, `undefined` when it fails. */
async function gitBytes(
  folder: string,
  args: string[]
): Promise<Uint8Array | undefined> {
  const child = Bun.spawn(["git", `--git-dir=${folder}`, ...args], {
    cwd: tmpdir(),
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
    stdout: "pipe",
    stderr: "ignore",
    signal: AbortSignal.timeout(GIT_TIMEOUT_MS),
  })
  const [bytes, exitCode] = await Promise.all([
    new Response(child.stdout).bytes(),
    child.exited,
  ])
  if (exitCode !== 0) return undefined
  return bytes
}

const KINDS: Record<string, FolderEntry["kind"]> = {
  tree: "folder",
  blob: "file",
  commit: "submodule",
}

/**
 * The entries of the folder at `path` (the root when empty) on `branch` of
 * the bare repository at `folder`: folders first, then by name.
 */
export async function readFolder(
  folder: string,
  branch: string,
  path: string
): Promise<FolderResult> {
  const output = await git(folder, [
    "ls-tree",
    "-z",
    "--long",
    objectName(branch, path),
  ])
  if (output === undefined) return { ok: false }
  const entries: FolderEntry[] = []
  for (const record of output.split("\0")) {
    const entry = parseRecord(record, path)
    if (entry !== undefined) entries.push(entry)
  }
  return { ok: true, entries: entries.toSorted(compareEntries) }
}

/** One `ls-tree --long` record: `<mode> <type> <object> <size>\t<name>`. */
function parseRecord(record: string, parent: string): FolderEntry | undefined {
  const tab = record.indexOf("\t")
  if (tab === -1) return undefined
  const name = record.slice(tab + 1)
  const [, type, , size] = record.slice(0, tab).split(/ +/)
  const kind = KINDS[type ?? ""]
  if (kind === undefined) return undefined
  const path = parent === "" ? name : `${parent}/${name}`
  if (kind !== "file") return { name, path, kind, size: null }
  return { name, path, kind, size: Number(size) }
}

function compareEntries(a: FolderEntry, b: FolderEntry): number {
  if (a.kind === "folder" && b.kind !== "folder") return -1
  if (a.kind !== "folder" && b.kind === "folder") return 1
  return a.name.localeCompare(b.name)
}

/**
 * The file at `path` on `branch` of the bare repository at `folder`: its
 * text when it is a text file within `MAX_FILE_BYTES`, otherwise only its
 * size and why it isn't read.
 */
export async function readFile(
  folder: string,
  branch: string,
  path: string
): Promise<FileResult> {
  const object = objectName(branch, path)
  const type = await git(folder, ["cat-file", "-t", object])
  if (type?.trim() !== "blob") return { ok: false }
  const sizeOutput = await git(folder, ["cat-file", "-s", object])
  if (sizeOutput === undefined) return { ok: false }
  const size = Number(sizeOutput.trim())
  if (size > MAX_FILE_BYTES) return { ok: true, size, kind: "too-large" }
  const bytes = await gitBytes(folder, ["cat-file", "blob", object])
  if (bytes === undefined) return { ok: false }
  if (bytes.subarray(0, BINARY_SNIFF_BYTES).includes(0)) {
    return { ok: true, size, kind: "binary" }
  }
  return { ok: true, size, kind: "text", content: decoder.decode(bytes) }
}

const decoder = new TextDecoder("utf-8")
