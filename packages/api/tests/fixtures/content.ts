import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import type { SyncResult } from "@nonete/content"
import type { RepositoryStore, StoredRepository } from "#v1/content/reader"

/** A small valid content repository: two types, one pointing at the other. */
export const CONTENT_SITE: Record<string, string> = {
  "doc.config.yaml": 'nombre: Homelab\nplataforma: "1"\n',
  "catalogo/ubicaciones/_tipo.yaml":
    "nombre: Ubicación\nplural: Ubicaciones\ncampos:\n  nombre: { tipo: texto }\n",
  "catalogo/ubicaciones/casa.yaml": "nombre: Casa\n",
  "catalogo/maquinas/_tipo.yaml": [
    "nombre: Máquina",
    "plural: Máquinas",
    "campos:",
    "  ip: { tipo: ip }",
    "  ubicacion: { tipo: ref, a: ubicaciones }",
    "  ficha: { tipo: ficha, opcional: true }",
  ].join("\n"),
  "catalogo/maquinas/nas.yaml": "ip: 192.168.1.30\nubicacion: casa\n",
  "docs/index.mdx": "---\ntitulo: Inicio\n---\n",
  "docs/red/dns.mdx": "---\ntitulo: DNS\n---\n",
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
    find: async (slug) => rows.find((row) => row.slug === slug),
    list: async () => [...rows],
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
    ...overrides,
  }
}

/**
 * A git repository on disk, reached over `file://`, holding `files` on main:
 * syncs run the real git CLI and stay hermetic.
 */
export async function createContentRemote(
  files: Record<string, string> = CONTENT_SITE
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
  await git(work, ["commit", "--quiet", "-m", "content"])
  await git(work, ["push", "--quiet", bare, "main"])
  return {
    url: `file://${bare}`,
    remove: () => rm(base, { recursive: true, force: true }),
  }
}

/** Runs git in `cwd` with a fixed identity, failing loudly. */
export async function git(cwd: string, args: string[]) {
  const child = Bun.spawn(
    ["git", "-c", "user.name=test", "-c", "user.email=test@test", ...args],
    {
      cwd,
      env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
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
