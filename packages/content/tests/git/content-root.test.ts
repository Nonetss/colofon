import { afterEach, describe, expect, test } from "bun:test"
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { contentPathProblem, resolveContentRoot } from "#git/content-root"

const cleanups: (() => Promise<void>)[] = []

afterEach(async () => {
  for (const cleanup of cleanups.splice(0)) await cleanup()
})

async function tempFolder(): Promise<string> {
  const folder = await mkdtemp(path.join(tmpdir(), "content-root-"))
  cleanups.push(() => rm(folder, { recursive: true, force: true }))
  return folder
}

describe("contentPathProblem", () => {
  test.each(["", "docs", "docs/sitio", "a-b/c_d"])(
    "%s is accepted",
    (value) => {
      expect(contentPathProblem(value)).toBeUndefined()
    }
  )

  test.each([
    "/etc",
    "../fuera",
    "docs/../fuera",
    "docs/./x",
    "docs//x",
    "docs/",
    ".git",
    ".hidden/docs",
    "x".repeat(256),
  ])("%s is refused with a message", (value) => {
    expect(contentPathProblem(value)).toBeString()
  })
})

describe("resolveContentRoot", () => {
  test("an empty path is the clone itself, even before it exists", async () => {
    expect(await resolveContentRoot("/nonexistent/clone", "")).toEqual({
      ok: true,
      root: "/nonexistent/clone",
    })
  })

  test("a folder of the clone resolves under it", async () => {
    const clone = await tempFolder()
    await mkdir(path.join(clone, "docs"))
    expect(await resolveContentRoot(clone, "docs")).toEqual({
      ok: true,
      root: path.join(clone, "docs"),
    })
  })

  test("a folder that does not exist is missing", async () => {
    const clone = await tempFolder()
    expect(await resolveContentRoot(clone, "docs")).toEqual({
      ok: false,
      reason: "missing",
    })
  })

  test("a file is not a content folder", async () => {
    const clone = await tempFolder()
    await writeFile(path.join(clone, "docs"), "x")
    expect(await resolveContentRoot(clone, "docs")).toEqual({
      ok: false,
      reason: "missing",
    })
  })

  test("a symbolic link out of the clone is outside", async () => {
    const clone = await tempFolder()
    const elsewhere = await tempFolder()
    await symlink(elsewhere, path.join(clone, "docs"))
    expect(await resolveContentRoot(clone, "docs")).toEqual({
      ok: false,
      reason: "outside",
    })
  })

  test("a symbolic link within the clone is accepted", async () => {
    const clone = await tempFolder()
    await mkdir(path.join(clone, "real"))
    await symlink(path.join(clone, "real"), path.join(clone, "docs"))
    expect((await resolveContentRoot(clone, "docs")).ok).toBe(true)
  })

  test("a path that climbs is refused without touching the disk", async () => {
    const clone = await tempFolder()
    expect(await resolveContentRoot(clone, "../x")).toEqual({
      ok: false,
      reason: "outside",
    })
  })
})
