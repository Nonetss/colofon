import { describe, expect, test } from "bun:test"
import { mkdir } from "node:fs/promises"
import path from "node:path"
import { readStyles } from "#styles/read"
import { createContentDir } from "#tests/fixtures/content-dir"

const fileUrlOf = (docsPath: string) => `/files/${docsPath}`

/** Reads the styles of a repository made of `files`. */
async function stylesOf(
  files: Record<string, string>,
  docsFiles: ReadonlySet<string> = new Set()
) {
  const dir = await createContentDir(files)
  try {
    return await readStyles(dir.root, docsFiles, fileUrlOf)
  } finally {
    await dir.remove()
  }
}

/** A rule of `bytes` bytes, more or less, for the size limits. */
function ruleOf(bytes: number): string {
  return `.a{content:"${"x".repeat(bytes)}"}`
}

describe("readStyles", () => {
  test("a repository without styles/ has an empty stylesheet and no problem", async () => {
    expect(await stylesOf({ "doc.config.yaml": "nombre: Casa\n" })).toEqual({
      css: "",
      problems: [],
    })
  })

  test("modules are joined in the platform's order, whatever their names sort to", async () => {
    const styles = await stylesOf({
      "styles/callouts.css": ".avisos { color: red }",
      "styles/tables.css": ".tablas { color: red }",
      "styles/theme.css": ":root { --primary: red }",
    })
    expect(styles.css).toBe(
      ":root{--primary:red}\n.tablas{color:red}\n.avisos{color:red}"
    )
    expect(styles.problems).toEqual([])
  })

  test("an entry that is not a module is reported naming the modules, and ignored", async () => {
    const dir = await createContentDir({
      "styles/tablas.css": ".a { color: red }",
      "styles/theme.css": ":root { --primary: red }",
      "styles/.gitkeep": "",
    })
    await mkdir(path.join(dir.root, "styles/extra"))
    try {
      const styles = await readStyles(dir.root, new Set(), fileUrlOf)
      expect(styles.css).toBe(":root{--primary:red}")
      expect(styles.problems.map((problem) => problem.file)).toEqual([
        "styles/extra",
        "styles/tablas.css",
      ])
      expect(styles.problems[1]?.message).toContain("theme.css, page.css")
    } finally {
      await dir.remove()
    }
  })

  test("the cleaning's problems are reported on the module's path", async () => {
    const styles = await stylesOf({
      "styles/code.css": "@import 'x.css';\n.a { color: red }",
    })
    expect(styles.css).toBe(".a{color:red}")
    expect(styles.problems).toEqual([
      expect.objectContaining({ file: "styles/code.css", line: 1 }),
    ])
  })

  test("images under docs/ are rewritten with the reader's route", async () => {
    const styles = await stylesOf(
      { "styles/page.css": ".a { background: url(../docs/img/f.png) }" },
      new Set(["img/f.png"])
    )
    expect(styles.css).toBe(".a{background:url(/files/img/f.png)}")
  })

  test("a module over 64 KiB is left out and the others are used", async () => {
    const styles = await stylesOf({
      "styles/theme.css": ":root { --primary: red }",
      "styles/diagrams.css": ruleOf(80 * 1024),
    })
    expect(styles.css).toBe(":root{--primary:red}")
    expect(styles.problems).toEqual([
      expect.objectContaining({
        file: "styles/diagrams.css",
        message: expect.stringContaining("64 KiB"),
      }),
    ])
  })

  test("the module that takes the stylesheet over 128 KiB is left out with every one after it", async () => {
    const styles = await stylesOf({
      "styles/theme.css": ":root { --primary: red }",
      "styles/page.css": ruleOf(60 * 1024),
      "styles/code.css": ruleOf(60 * 1024),
      "styles/tables.css": ruleOf(60 * 1024),
      "styles/sections.css": ".s { color: red }",
    })
    expect(styles.css).not.toContain(".s{")
    expect(styles.css.split("\n")).toHaveLength(3)
    expect(styles.problems.map((problem) => problem.file)).toEqual([
      "styles/tables.css",
      "styles/sections.css",
    ])
  })
})
