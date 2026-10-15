import { describe, expect, test } from "bun:test"
import {
  fileLanguage,
  fileTokens,
} from "@/features/admin/git-repository/model/file-highlight"

function joined(tokens: { value: string }[]): string {
  return tokens.map((token) => token.value).join("")
}

describe("fileLanguage", () => {
  test("reads the extension through the highlighter's aliases", () => {
    expect(fileLanguage("docs/guia.md")).toBe("markdown")
    expect(fileLanguage("doc.config.yml")).toBe("yaml")
    expect(fileLanguage("src/index.ts")).toBe("ts")
    expect(fileLanguage("scripts/run.sh")).toBe("shell")
  })

  test("covers the extensions the highlighter has no alias for", () => {
    expect(fileLanguage("docs/inicio.mdx")).toBe("markdown")
    expect(fileLanguage("vite.config.mts")).toBe("ts")
    expect(fileLanguage("src/pages/index.astro")).toBe("html")
  })

  test("knows files by their whole name, case-insensitively", () => {
    expect(fileLanguage("apps/backend/Dockerfile")).toBe("dockerfile")
    expect(fileLanguage("apps/backend/Dockerfile.dev")).toBe("dockerfile")
    expect(fileLanguage(".env")).toBe("env")
    expect(fileLanguage(".env.local")).toBe("env")
  })

  test("falls back to plain text", () => {
    expect(fileLanguage("LICENSE")).toBe("plaintext")
    expect(fileLanguage(".gitignore")).toBe("plaintext")
    expect(fileLanguage("notas.desconocida")).toBe("plaintext")
  })
})

describe("fileTokens", () => {
  test("tokens join back to the exact text", () => {
    const content = "const a = 1\r\n\tconst b = 'x'\n"

    expect(joined(fileTokens(content, "a.ts"))).toBe(content)
  })

  test("a Markdown file's frontmatter is YAML, not a heading", () => {
    const content =
      "---\nname: documentation\ndescription: Map\n---\n\n# Documentation\n"
    const tokens = fileTokens(content, "skills/doc/SKILL.md")

    expect(joined(tokens)).toBe(content)
    expect(tokens).toContainEqual({ className: "property", value: "name" })
    expect(tokens).toContainEqual({
      className: "heading",
      value: "# Documentation",
    })
    expect(
      tokens.some(
        (token) =>
          token.className === "heading" && token.value.includes("description")
      )
    ).toBe(false)
  })

  test("leaves a dashed block alone outside Markdown", () => {
    const content = "---\nname: x\n---\n"

    expect(fileTokens(content, "notas.txt")).toEqual([{ value: content }])
  })
})
