import { afterEach, describe, expect, test } from "bun:test"
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { buildTarGz, isSafeArchivePath } from "#v1/skills/archive"

const folders: string[] = []

afterEach(async () => {
  await Promise.all(
    folders
      .splice(0)
      .map((folder) => rm(folder, { recursive: true, force: true }))
  )
})

async function tempFolder(): Promise<string> {
  const folder = await mkdtemp(path.join(tmpdir(), "skill-archive-"))
  folders.push(folder)
  return folder
}

/** Every file under `root`, as relative path → text. */
async function filesOf(root: string): Promise<Record<string, string>> {
  const entries = await readdir(root, { recursive: true, withFileTypes: true })
  const files: Record<string, string> = {}
  for (const entry of entries) {
    if (!entry.isFile()) continue
    const full = path.join(entry.parentPath, entry.name)
    files[path.relative(root, full)] = await readFile(full, "utf8")
  }
  return files
}

/** Extracts `archive` with the system's tar into a new folder. */
async function extract(archive: Uint8Array): Promise<string> {
  const folder = await tempFolder()
  const file = path.join(folder, "skill.tar.gz")
  await writeFile(file, archive)
  const out = path.join(folder, "out")
  await Bun.$`mkdir -p ${out} && tar -xzf ${file} -C ${out}`.quiet()
  return out
}

const FILES = [
  { path: "references/z.md", content: "zeta\n" },
  { path: "SKILL.md", content: "---\nname: x\n---\n# Ñandú\n" },
  { path: "references/a/b.md", content: "b".repeat(1500) },
]

describe("buildTarGz", () => {
  test("the same files give the same bytes, whatever their order", () => {
    const first = buildTarGz(FILES)
    const second = buildTarGz([...FILES].reverse())
    expect(Buffer.from(first).equals(Buffer.from(second))).toBe(true)
  })

  test("tar extracts every file at the root, SKILL.md included", async () => {
    const out = await extract(buildTarGz(FILES))
    expect(await filesOf(out)).toEqual({
      "SKILL.md": "---\nname: x\n---\n# Ñandú\n",
      "references/a/b.md": "b".repeat(1500),
      "references/z.md": "zeta\n",
    })
  })

  test("a long path is split into ustar's prefix and still extracts", async () => {
    const long = `${"carpeta-larga/".repeat(9)}fichero.md`
    const out = await extract(buildTarGz([{ path: long, content: "x" }]))
    expect(await filesOf(out)).toEqual({ [long]: "x" })
  })

  test("refuses a path that leaves the root", () => {
    for (const unsafe of ["../x.md", "/etc/passwd", "a/../../x.md", "a//b.md"])
      expect(() => buildTarGz([{ path: unsafe, content: "" }])).toThrow()
  })
})

describe("isSafeArchivePath", () => {
  test("only relative paths without empty, . or .. segments", () => {
    expect(isSafeArchivePath("references/type-bar.md")).toBe(true)
    for (const unsafe of ["", "/a", "../a", "a/./b", "a/", "a/../b"])
      expect(isSafeArchivePath(unsafe)).toBe(false)
  })
})
