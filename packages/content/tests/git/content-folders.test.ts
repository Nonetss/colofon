import { afterEach, describe, expect, test } from "bun:test"
import { readdir } from "node:fs/promises"
import { tmpdir } from "node:os"
import {
  foldersHoldingConfig,
  listContentFolders,
  MAX_CONTENT_FOLDERS,
} from "#git/content-folders"
import { createGitRemote, type GitRemote } from "#tests/fixtures/git-remote"

const cleanups: (() => Promise<void>)[] = []

afterEach(async () => {
  for (const cleanup of cleanups.splice(0)) await cleanup()
})

async function remote(): Promise<GitRemote> {
  const created = await createGitRemote()
  cleanups.push(created.remove)
  return created
}

const CONFIG = 'nombre: Sitio\nplataforma: "1"\n'

describe("foldersHoldingConfig", () => {
  test("keeps the folder of each config, the root first and the rest in order", () => {
    expect(
      foldersHoldingConfig([
        "zeta/doc.config.yaml",
        "doc.config.yaml",
        "alfa/doc.config.yaml",
        "alfa/docs/index.mdx",
        "README.md",
      ])
    ).toEqual(["", "alfa", "zeta"])
  })

  test("leaves out folders that can't be a content path", () => {
    expect(
      foldersHoldingConfig([".github/doc.config.yaml", "ok/doc.config.yaml"])
    ).toEqual(["ok"])
  })

  test("a file merely named like the config in another extension is not one", () => {
    expect(foldersHoldingConfig(["docs/doc.config.yml"])).toEqual([])
  })

  test("at most the limit is returned", () => {
    const paths = Array.from(
      { length: MAX_CONTENT_FOLDERS + 20 },
      (_, index) => `s${String(index).padStart(3, "0")}/doc.config.yaml`
    )
    expect(foldersHoldingConfig(paths)).toHaveLength(MAX_CONTENT_FOLDERS)
  })
})

describe("listContentFolders", () => {
  test("a site inside docs is found", async () => {
    const origin = await remote()
    await origin.commit({
      "docs/doc.config.yaml": CONFIG,
      "docs/docs/index.mdx": "x\n",
      "apps/web/index.ts": "x\n",
    })
    expect(await listContentFolders(origin.url)).toEqual({
      ok: true,
      folders: ["docs"],
    })
  })

  test("the root and a subfolder are both listed, the root first", async () => {
    const origin = await remote()
    await origin.commit({
      "doc.config.yaml": CONFIG,
      "ejemplo/doc.config.yaml": CONFIG,
    })
    expect(await listContentFolders(origin.url)).toEqual({
      ok: true,
      folders: ["", "ejemplo"],
    })
  })

  test("a repository without a site answers an empty list", async () => {
    const origin = await remote()
    await origin.commit({ "README.md": "x\n" })
    expect(await listContentFolders(origin.url)).toEqual({
      ok: true,
      folders: [],
    })
  })

  test("the folders follow the ref", async () => {
    const origin = await remote()
    await origin.commit({ "docs/doc.config.yaml": CONFIG })
    await origin.branch("produccion")
    await origin.move("docs/doc.config.yaml", "sitio/doc.config.yaml")

    expect(await listContentFolders(origin.url)).toEqual({
      ok: true,
      folders: ["sitio"],
    })
    expect(await listContentFolders(origin.url, { ref: "produccion" })).toEqual(
      { ok: true, folders: ["docs"] }
    )
  })

  test("a ref the remote lacks fails with git's error", async () => {
    const origin = await remote()
    await origin.commit({ "docs/doc.config.yaml": CONFIG })
    const result = await listContentFolders(origin.url, { ref: "nada" })
    expect(result.ok).toBe(false)
  })

  test("a remote that can't be read fails without its credentials", async () => {
    const url = "https://ana:secreto@127.0.0.1:9/x.git"
    const result = await listContentFolders(url, { timeoutMs: 5000 })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).not.toContain("secreto")
  })

  test("a bare repository is read in place", async () => {
    const origin = await remote()
    await origin.commit({ "docs/doc.config.yaml": CONFIG })
    const bare = origin.url.replace("file://", "")
    expect(await listContentFolders(bare, { bare: true })).toEqual({
      ok: true,
      folders: ["docs"],
    })
  })

  test("a bare repository nothing was pushed to has no folders", async () => {
    const origin = await remote()
    const bare = origin.url.replace("file://", "")
    expect(await listContentFolders(bare, { bare: true })).toEqual({
      ok: true,
      folders: [],
    })
  })

  test("only https is allowed for a remote a user typed", async () => {
    const origin = await remote()
    await origin.commit({ "docs/doc.config.yaml": CONFIG })
    const result = await listContentFolders(origin.url, { httpsOnly: true })
    expect(result.ok).toBe(false)
  })

  test("the scratch folder is removed, whether the read worked or not", async () => {
    const origin = await remote()
    await origin.commit({ "docs/doc.config.yaml": CONFIG })
    const scratch = async () =>
      (await readdir(tmpdir())).filter((name) =>
        name.startsWith("content-folders-")
      )
    const before = await scratch()

    await listContentFolders(origin.url)
    await listContentFolders(origin.url, { ref: "nada" })

    expect(await scratch()).toEqual(before)
  })
})
