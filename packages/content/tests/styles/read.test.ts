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
  test("a repository without estilos/ has an empty stylesheet and no problem", async () => {
    expect(await stylesOf({ "doc.config.yaml": "nombre: Casa\n" })).toEqual({
      css: "",
      problems: [],
    })
  })

  test("modules are joined in the platform's order, whatever their names sort to", async () => {
    const styles = await stylesOf({
      "estilos/avisos.css": ".avisos { color: red }",
      "estilos/tablas.css": ".tablas { color: red }",
      "estilos/tema.css": ":root { --primary: red }",
    })
    expect(styles.css).toBe(
      ":root{--primary:red}\n.tablas{color:red}\n.avisos{color:red}"
    )
    expect(styles.problems).toEqual([])
  })

  test("an entry that is not a module is reported naming the modules, and ignored", async () => {
    const dir = await createContentDir({
      "estilos/tables.css": ".a { color: red }",
      "estilos/tema.css": ":root { --primary: red }",
      "estilos/.gitkeep": "",
    })
    await mkdir(path.join(dir.root, "estilos/extra"))
    try {
      const styles = await readStyles(dir.root, new Set(), fileUrlOf)
      expect(styles.css).toBe(":root{--primary:red}")
      expect(styles.problems.map((problem) => problem.file)).toEqual([
        "estilos/extra",
        "estilos/tables.css",
      ])
      expect(styles.problems[1]?.message).toContain("tema.css, pagina.css")
    } finally {
      await dir.remove()
    }
  })

  test("the cleaning's problems are reported on the module's path", async () => {
    const styles = await stylesOf({
      "estilos/codigo.css": "@import 'x.css';\n.a { color: red }",
    })
    expect(styles.css).toBe(".a{color:red}")
    expect(styles.problems).toEqual([
      expect.objectContaining({ file: "estilos/codigo.css", line: 1 }),
    ])
  })

  test("images under docs/ are rewritten with the reader's route", async () => {
    const styles = await stylesOf(
      { "estilos/pagina.css": ".a { background: url(../docs/img/f.png) }" },
      new Set(["img/f.png"])
    )
    expect(styles.css).toBe(".a{background:url(/files/img/f.png)}")
  })

  test("a module over 64 KiB is left out and the others are used", async () => {
    const styles = await stylesOf({
      "estilos/tema.css": ":root { --primary: red }",
      "estilos/diagramas.css": ruleOf(80 * 1024),
    })
    expect(styles.css).toBe(":root{--primary:red}")
    expect(styles.problems).toEqual([
      expect.objectContaining({
        file: "estilos/diagramas.css",
        message: expect.stringContaining("64 KiB"),
      }),
    ])
  })

  test("the module that takes the stylesheet over 128 KiB is left out with every one after it", async () => {
    const styles = await stylesOf({
      "estilos/tema.css": ":root { --primary: red }",
      "estilos/pagina.css": ruleOf(60 * 1024),
      "estilos/codigo.css": ruleOf(60 * 1024),
      "estilos/tablas.css": ruleOf(60 * 1024),
      "estilos/secciones.css": ".s { color: red }",
    })
    expect(styles.css).not.toContain(".s{")
    expect(styles.css.split("\n")).toHaveLength(3)
    expect(styles.problems.map((problem) => problem.file)).toEqual([
      "estilos/tablas.css",
      "estilos/secciones.css",
    ])
  })
})
