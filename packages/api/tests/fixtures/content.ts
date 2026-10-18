import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import type { SyncResult } from "@nonete/content"
import {
  isVisibleTo,
  type RepositoryStore,
  type StoredRepository,
} from "#v1/content/reader"

/** A small valid content repository: two types, one pointing at the other. */
export const CONTENT_SITE: Record<string, string> = {
  "doc.config.yaml": 'name: Homelab\ncontract: "2"\n',
  "catalog/ubicaciones/_type.yaml":
    "name: Ubicación\nplural: Ubicaciones\nfields:\n  name: { type: text }\n",
  "catalog/ubicaciones/casa.yaml": "name: Casa\n",
  "catalog/maquinas/_type.yaml": [
    "name: Máquina",
    "plural: Máquinas",
    "fields:",
    "  ip: { type: ip }",
    "  ubicacion: { type: ref, to: ubicaciones }",
    "  ficha: { type: page, optional: true }",
  ].join("\n"),
  "catalog/maquinas/nas.yaml": "ip: 192.168.1.30\nubicacion: casa\n",
  "docs/index.mdx": "---\ntitle: Inicio\n---\n",
  "docs/red/dns.mdx": "---\ntitle: DNS\n---\n",
}

/** A content folder in a temp directory; `write` changes files in place. */
export type ContentFolder = {
  root: string
  write: (files: Record<string, string>) => Promise<void>
  remove: () => Promise<void>
}

export async function createContentFolder(
  files: Record<string, string> = CONTENT_SITE
): Promise<ContentFolder> {
  const root = await mkdtemp(path.join(tmpdir(), "api-content-"))
  const write = async (changes: Record<string, string>) => {
    for (const [file, text] of Object.entries(changes)) {
      const target = path.join(root, file)
      await mkdir(path.dirname(target), { recursive: true })
      await writeFile(target, text)
    }
  }
  await write(files)
  return {
    root,
    write,
    remove: () => rm(root, { recursive: true, force: true }),
  }
}

/** The repositories a test stores, and every sync outcome recorded on them. */
export type MemoryRepositoryStore = RepositoryStore & {
  rows: StoredRepository[]
  recorded: { id: string; result: SyncResult }[]
}

/** A repository store over `rows`, kept in memory; `list` keeps their order. */
export function memoryRepositoryStore(
  rows: StoredRepository[] = []
): MemoryRepositoryStore {
  const recorded: { id: string; result: SyncResult }[] = []
  return {
    rows,
    recorded,
    find: async (slug, audience) =>
      rows.find((row) => row.slug === slug && isVisibleTo(row, audience)),
    list: async (audience) => rows.filter((row) => isVisibleTo(row, audience)),
    recordSync: async (id, result) => {
      recorded.push({ id, result })
    },
  }
}

/** A stored repository; its id names its clone folder. */
export function storedRepository(
  overrides: Partial<StoredRepository> = {}
): StoredRepository {
  return {
    id: "repo-1",
    slug: "documentacion",
    name: "Documentación",
    url: "https://git.example/documentacion.git",
    ref: "main",
    contentPath: "",
    ownerId: null,
    credentialId: null,
    ...overrides,
  }
}

/**
 * A git repository on disk, reached over `file://`, holding `files` on main:
 * syncs run the real git CLI and stay hermetic. `date` (ISO 8601) dates its
 * commit, now when left out.
 */
export async function createContentRemote(
  files: Record<string, string> = CONTENT_SITE,
  date?: string
): Promise<{ url: string; remove: () => Promise<void> }> {
  const base = await mkdtemp(path.join(tmpdir(), "api-content-remote-"))
  const bare = path.join(base, "remote.git")
  const work = path.join(base, "work")
  await git(base, ["init", "--quiet", "--bare", "--initial-branch=main", bare])
  await git(base, ["init", "--quiet", "--initial-branch=main", work])
  for (const [file, text] of Object.entries(files)) {
    const target = path.join(work, file)
    await mkdir(path.dirname(target), { recursive: true })
    await writeFile(target, text)
  }
  await git(work, ["add", "--all"])
  await git(work, ["commit", "--quiet", "-m", "content"], dateEnv(date))
  await git(work, ["push", "--quiet", bare, "main"])
  return {
    url: `file://${bare}`,
    remove: () => rm(base, { recursive: true, force: true }),
  }
}

function dateEnv(date: string | undefined): Record<string, string> {
  if (date === undefined) return {}
  return { GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date }
}

/** Runs git in `cwd` with a fixed identity, failing loudly. */
export async function git(
  cwd: string,
  args: string[],
  env: Record<string, string> = {}
) {
  const child = Bun.spawn(
    ["git", "-c", "user.name=test", "-c", "user.email=test@test", ...args],
    {
      cwd,
      env: { ...process.env, GIT_TERMINAL_PROMPT: "0", ...env },
      stdout: "pipe",
      stderr: "pipe",
    }
  )
  const [stderr, exitCode] = await Promise.all([
    new Response(child.stderr).text(),
    child.exited,
  ])
  if (exitCode !== 0) throw new Error(`git ${args.join(" ")}: ${stderr}`)
}
