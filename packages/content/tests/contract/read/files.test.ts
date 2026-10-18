import { afterEach, describe, expect, test } from "bun:test"
import path from "node:path"
import { listDir, listVisible } from "#contract/read/files"
import { type ContentDir, createContentDir } from "#tests/fixtures/content-dir"

let dir: ContentDir | undefined

afterEach(async () => {
  await dir?.remove()
  dir = undefined
})

describe("listDir", () => {
  test("lists every entry sorted by name, hidden ones included", async () => {
    dir = await createContentDir({
      "b.txt": "",
      "a/x.txt": "",
      ".git/HEAD": "",
    })
    const names = (await listDir(dir.root)).map((entry) => entry.name)
    expect(names).toEqual([".git", "a", "b.txt"])
  })

  test("a folder that does not exist has no entries", async () => {
    dir = await createContentDir({})
    expect(await listDir(path.join(dir.root, "missing"))).toEqual([])
  })
})

describe("listVisible", () => {
  test("leaves out the entries whose name starts with a dot", async () => {
    dir = await createContentDir({ "b.txt": "", ".hidden": "", "a/x.txt": "" })
    const names = (await listVisible(dir.root)).map((entry) => entry.name)
    expect(names).toEqual(["a", "b.txt"])
  })
})
