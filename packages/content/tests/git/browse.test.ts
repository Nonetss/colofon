import { afterEach, describe, expect, test } from "bun:test"
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { MAX_FILE_BYTES, readFile, readFolder } from "#git/browse"
import { git } from "#tests/fixtures/git-remote"

const cleanups: (() => Promise<void>)[] = []

afterEach(async () => {
  for (const cleanup of cleanups.splice(0)) await cleanup()
})

type Repo = {
  /** The bare repository's folder. */
  bare: string
  /** Commits `files` on main and pushes them. */
  commit: (files: Record<string, string | Uint8Array>) => Promise<void>
  /** Pushes main's current commit as `name`. */
  branch: (name: string) => Promise<void>
  /** Commits a submodule entry at `name` on main and pushes it. */
  submodule: (name: string) => Promise<void>
}

async function repo(): Promise<Repo> {
  const base = await mkdtemp(path.join(tmpdir(), "content-browse-"))
  cleanups.push(() => rm(base, { recursive: true, force: true }))
  const bare = path.join(base, "repo.git")
  const work = path.join(base, "work")
  await git(base, ["init", "--quiet", "--bare", "--initial-branch=main", bare])
  await git(base, ["init", "--quiet", "--initial-branch=main", work])
  const push = () => git(work, ["push", "--quiet", bare, "main"])
  return {
    bare,
    commit: async (files) => {
      for (const [file, content] of Object.entries(files)) {
        const target = path.join(work, file)
        await mkdir(path.dirname(target), { recursive: true })
        await writeFile(target, content)
      }
      await git(work, ["add", "--all"])
      await git(work, ["commit", "--quiet", "-m", "content"])
      await push()
    },
    branch: async (name) => {
      await git(work, ["push", "--quiet", bare, `main:refs/heads/${name}`])
    },
    submodule: async (name) => {
      const head = (await git(work, ["rev-parse", "HEAD"])).trim()
      await git(work, [
        "update-index",
        "--add",
        "--cacheinfo",
        `160000,${head},${name}`,
      ])
      await git(work, ["commit", "--quiet", "-m", "submodule"])
      await push()
    },
  }
}

const SITE = {
  "doc.config.yaml": "nombre: Manual\n",
  "docs/index.mdx": "---\ntitulo: Inicio\n---\n",
  "docs/red/dns.mdx": "# DNS\n",
  "catalogo/maquinas/_tipo.yaml": "nombre: Máquina\n",
}

describe("readFolder", () => {
  test("the root lists folders first, then files by name, with file sizes", async () => {
    const manual = await repo()
    await manual.commit({ ...SITE, "a.yaml": "x: 1\n" })

    expect(await readFolder(manual.bare, "main", "")).toEqual({
      ok: true,
      entries: [
        { name: "catalogo", path: "catalogo", kind: "folder", size: null },
        { name: "docs", path: "docs", kind: "folder", size: null },
        { name: "a.yaml", path: "a.yaml", kind: "file", size: 5 },
        {
          name: "doc.config.yaml",
          path: "doc.config.yaml",
          kind: "file",
          size: 15,
        },
      ],
    })
  })

  test("a nested folder gives each entry's path from the root", async () => {
    const manual = await repo()
    await manual.commit(SITE)

    expect(await readFolder(manual.bare, "main", "docs/red")).toEqual({
      ok: true,
      entries: [
        { name: "dns.mdx", path: "docs/red/dns.mdx", kind: "file", size: 6 },
      ],
    })
  })

  test("each branch shows its own files", async () => {
    const manual = await repo()
    await manual.commit(SITE)
    await manual.branch("borrador")
    await manual.commit({ "nuevo.yaml": "y: 2\n" })

    const names = async (branch: string) => {
      const result = await readFolder(manual.bare, branch, "")
      if (!result.ok) throw new Error(`no root on ${branch}`)
      return result.entries.map((entry) => entry.name)
    }
    expect(await names("main")).toContain("nuevo.yaml")
    expect(await names("borrador")).not.toContain("nuevo.yaml")
  })

  test("a submodule entry is a submodule, without a size", async () => {
    const manual = await repo()
    await manual.commit(SITE)
    await manual.submodule("vendor")

    const result = await readFolder(manual.bare, "main", "")
    if (!result.ok) throw new Error("no root")
    expect(result.entries).toContainEqual({
      name: "vendor",
      path: "vendor",
      kind: "submodule",
      size: null,
    })
  })

  test("an unknown branch or path, a file, or no repository is not there", async () => {
    const manual = await repo()
    await manual.commit(SITE)

    expect(await readFolder(manual.bare, "no-existe", "")).toEqual({
      ok: false,
    })
    expect(await readFolder(manual.bare, "main", "no-existe")).toEqual({
      ok: false,
    })
    expect(await readFolder(manual.bare, "main", "doc.config.yaml")).toEqual({
      ok: false,
    })
    expect(
      await readFolder(path.join(manual.bare, "missing"), "main", "")
    ).toEqual({ ok: false })
  })

  test("a branch nothing was pushed to is not there", async () => {
    const empty = await repo()

    expect(await readFolder(empty.bare, "main", "")).toEqual({ ok: false })
  })
})

describe("readFile", () => {
  test("a text file comes back with its content and size", async () => {
    const manual = await repo()
    await manual.commit(SITE)

    expect(await readFile(manual.bare, "main", "docs/index.mdx")).toEqual({
      ok: true,
      kind: "text",
      size: 23,
      content: "---\ntitulo: Inicio\n---\n",
    })
  })

  test("a file with a NUL byte is binary, without content", async () => {
    const manual = await repo()
    await manual.commit({ "diagrama.png": new Uint8Array([137, 80, 0, 71]) })

    expect(await readFile(manual.bare, "main", "diagrama.png")).toEqual({
      ok: true,
      kind: "binary",
      size: 4,
    })
  })

  test("a file over the limit is too large, without content", async () => {
    const manual = await repo()
    await manual.commit({ "grande.txt": "a".repeat(MAX_FILE_BYTES + 1) })

    expect(await readFile(manual.bare, "main", "grande.txt")).toEqual({
      ok: true,
      kind: "too-large",
      size: MAX_FILE_BYTES + 1,
    })
  })

  test("a file at the limit is still read", async () => {
    const manual = await repo()
    await manual.commit({ "justo.txt": "a".repeat(MAX_FILE_BYTES) })

    const result = await readFile(manual.bare, "main", "justo.txt")
    expect(result).toMatchObject({ ok: true, kind: "text" })
  })

  test("a folder, an unknown path or an unknown branch is not there", async () => {
    const manual = await repo()
    await manual.commit(SITE)

    expect(await readFile(manual.bare, "main", "docs")).toEqual({ ok: false })
    expect(await readFile(manual.bare, "main", "no-existe.mdx")).toEqual({
      ok: false,
    })
    expect(await readFile(manual.bare, "otra", "docs/index.mdx")).toEqual({
      ok: false,
    })
  })
})
