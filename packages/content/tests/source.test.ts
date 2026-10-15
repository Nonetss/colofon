import { afterEach, describe, expect, test } from "bun:test"
import { existsSync } from "node:fs"
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import {
  CLONE_DIR,
  cloneFolder,
  createRepoSync,
  describeRepository,
  listRemoteBranches,
  pruneClones,
  publicUrl,
  redactCredentials,
  type SyncResult,
} from "#source"
import {
  createGitRemote,
  type GitRemote,
  git,
} from "#tests/fixtures/git-remote"

const cleanups: (() => Promise<void>)[] = []

afterEach(async () => {
  for (const cleanup of cleanups.splice(0)) await cleanup()
})

async function remote(): Promise<GitRemote> {
  const created = await createGitRemote()
  cleanups.push(created.remove)
  return created
}

async function tempFolder(): Promise<string> {
  const folder = await mkdtemp(path.join(tmpdir(), "content-clone-"))
  cleanups.push(() => rm(folder, { recursive: true, force: true }))
  return folder
}

function commitOf(result: SyncResult): string {
  if (!result.ok) throw new Error(result.error)
  return result.commit
}

describe("clone folders", () => {
  test("each repository's clone hangs from the clone root by its id", () => {
    expect(cloneFolder("/app/.content", "repo-id")).toBe(
      "/app/.content/repo-id"
    )
  })

  test("pruning removes every entry that is not a kept clone, a stray .git included", async () => {
    const root = await tempFolder()
    await mkdir(path.join(root, "kept", ".git"), { recursive: true })
    await mkdir(path.join(root, "gone"))
    await mkdir(path.join(root, ".git"))
    await writeFile(path.join(root, "doc.config.yaml"), "nombre: Viejo\n")

    const removed = await pruneClones(root, ["kept"])

    expect(removed.toSorted()).toEqual([".git", "doc.config.yaml", "gone"])
    expect(existsSync(path.join(root, "kept", ".git"))).toBe(true)
    expect(existsSync(root)).toBe(true)
  })

  test("pruning a clone root that does not exist removes nothing", async () => {
    const missing = path.join(await tempFolder(), "missing")
    expect(await pruneClones(missing, [])).toEqual([])
  })
})

describe("credentials", () => {
  const url = "https://user:s3cr%40t@git.example/doc.git"

  test("the public URL hides the user and the password", () => {
    expect(publicUrl(url)).toBe("https://***@git.example/doc.git")
    expect(publicUrl("git@git.example:doc.git")).toBe("git@git.example:doc.git")
  })

  test("text is redacted of the encoded and decoded password and the user", () => {
    expect(
      redactCredentials("fatal: s3cr%40t, s3cr@t and user rejected", url)
    ).toBe("fatal: ***, *** and *** rejected")
  })

  test("describing a repository names its slug and ref but never its credentials", () => {
    const line = describeRepository({ slug: "documentacion", url, ref: "v2" })
    expect(line).toContain("documentacion")
    expect(line).toContain("v2")
    expect(line).not.toContain("s3cr")
    expect(line).not.toContain("user")
  })
})

describe("createRepoSync", () => {
  test("the first sync clones the ref and later syncs pick up new commits", async () => {
    const origin = await remote()
    await origin.commit({ "doc.config.yaml": "nombre: Uno\n" })
    const root = await tempFolder()
    const sync = createRepoSync({ url: origin.url, ref: "main", root })

    const first = commitOf(await sync())
    expect(await readFile(path.join(root, "doc.config.yaml"), "utf8")).toBe(
      "nombre: Uno\n"
    )

    await origin.commit({ "doc.config.yaml": "nombre: Dos\n" })
    const second = commitOf(await sync())
    expect(second).not.toBe(first)
    expect(await readFile(path.join(root, "doc.config.yaml"), "utf8")).toBe(
      "nombre: Dos\n"
    )
  })

  test("a tag can be the ref", async () => {
    const origin = await remote()
    await origin.commit({ "a.yaml": "version: 1\n" })
    await origin.tag("v1")
    await origin.commit({ "a.yaml": "version: 2\n" })
    const root = await tempFolder()

    commitOf(await createRepoSync({ url: origin.url, ref: "v1", root })())
    expect(await readFile(path.join(root, "a.yaml"), "utf8")).toBe(
      "version: 1\n"
    )
  })

  test("local changes in the clone are discarded", async () => {
    const origin = await remote()
    await origin.commit({ "a.yaml": "x: 1\n" })
    const root = await tempFolder()
    const sync = createRepoSync({ url: origin.url, ref: "main", root })
    commitOf(await sync())

    await writeFile(path.join(root, "a.yaml"), "x: changed\n")
    await writeFile(path.join(root, "stray.yaml"), "y: 1\n")
    commitOf(await sync())
    expect(await readFile(path.join(root, "a.yaml"), "utf8")).toBe("x: 1\n")
    expect(existsSync(path.join(root, "stray.yaml"))).toBe(false)
  })

  test("another repository replaces the clone", async () => {
    const first = await remote()
    await first.commit({ "first.yaml": "a: 1\n" })
    const second = await remote()
    await second.commit({ "second.yaml": "b: 1\n" })
    const root = await tempFolder()

    commitOf(await createRepoSync({ url: first.url, ref: "main", root })())
    commitOf(await createRepoSync({ url: second.url, ref: "main", root })())
    expect(existsSync(path.join(root, "first.yaml"))).toBe(false)
    expect(existsSync(path.join(root, "second.yaml"))).toBe(true)
  })

  test("a failed sync keeps the last checkout and reports no credentials", async () => {
    const origin = await remote()
    await origin.commit({ "a.yaml": "x: 1\n" })
    const root = await tempFolder()
    commitOf(await createRepoSync({ url: origin.url, ref: "main", root })())

    const missing = await createRepoSync({
      url: origin.url,
      ref: "no-such-branch",
      root,
    })()
    expect(missing.ok).toBe(false)
    expect(await readFile(path.join(root, "a.yaml"), "utf8")).toBe("x: 1\n")

    const unreachable = await createRepoSync({
      url: "https://user:s3cret@127.0.0.1:1/doc.git",
      ref: "main",
      root: await tempFolder(),
    })()
    if (unreachable.ok) throw new Error("expected the sync to fail")
    expect(unreachable.error).not.toContain("s3cret")
  })

  test("git never touches a repository around the clone folder", async () => {
    // The worst case: the folder around the clone is a checkout whose
    // origin is the content repository itself.
    const origin = await remote()
    await origin.commit({ "a.yaml": "x: 1\n" })
    const parent = await tempFolder()
    await git(parent, ["init", "--quiet"])
    await git(parent, ["remote", "add", "origin", origin.url])
    await writeFile(path.join(parent, ".env"), "SECRET=1\n")
    const root = path.join(parent, CLONE_DIR)
    await mkdir(root)

    commitOf(await createRepoSync({ url: origin.url, ref: "main", root })())
    expect(await readFile(path.join(parent, ".env"), "utf8")).toBe("SECRET=1\n")
    expect(existsSync(path.join(root, "a.yaml"))).toBe(true)
  })

  test("a call made while a sync runs gets that same sync", async () => {
    const origin = await remote()
    await origin.commit({ "a.yaml": "x: 1\n" })
    const sync = createRepoSync({
      url: origin.url,
      ref: "main",
      root: await tempFolder(),
    })
    const first = sync()
    expect(sync()).toBe(first)
    commitOf(await first)
  })
})

describe("listRemoteBranches", () => {
  test("lists the branches by name and the one HEAD points at, without tags", async () => {
    const origin = await remote()
    await origin.commit({ "a.yaml": "x: 1\n" })
    await origin.branch("produccion")
    await origin.branch("borrador")
    await origin.tag("v1")

    expect(await listRemoteBranches(origin.url)).toEqual({
      ok: true,
      branches: ["borrador", "main", "produccion"],
      defaultBranch: "main",
    })
  })

  test("an unreachable remote fails without its credentials", async () => {
    const result = await listRemoteBranches(
      "https://user:s3cret@127.0.0.1:1/doc.git"
    )
    if (result.ok) throw new Error("expected the listing to fail")
    expect(result.error).not.toContain("s3cret")
  })
})
