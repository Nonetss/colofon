import { describe, expect, test } from "bun:test"
import {
  codeLanguage,
  codeTokens,
} from "@/features/docs/page/model/code-highlight"

function joined(tokens: { value: string }[]): string {
  return tokens.map((token) => token.value).join("")
}

describe("codeLanguage", () => {
  test("reads a fence through the highlighter's aliases", () => {
    expect(codeLanguage("yaml")).toBe("yaml")
    expect(codeLanguage("yml")).toBe("yaml")
    expect(codeLanguage("bash")).toBe("shell")
    expect(codeLanguage("JSON")).toBe("json")
  })

  test("highlights mdx as markdown", () => {
    expect(codeLanguage("mdx")).toBe("markdown")
    expect(codeLanguage("MDX")).toBe("markdown")
  })

  test("falls back to plain text", () => {
    expect(codeLanguage(null)).toBe("plaintext")
    expect(codeLanguage("diagram")).toBe("plaintext")
  })
})

describe("codeTokens", () => {
  test("tokens join back to the exact text", () => {
    const code = "a: 1\n  # nota\n"

    expect(joined(codeTokens(code, "yaml"))).toBe(code)
  })

  test("an mdx frontmatter block is yaml, not a heading", () => {
    const code = "---\ntitulo: Hola\n---\n\n# Pagina\n"
    const tokens = codeTokens(code, "mdx")

    expect(joined(tokens)).toBe(code)
    expect(tokens).toContainEqual({ className: "property", value: "titulo" })
    expect(tokens).toContainEqual({ className: "heading", value: "# Pagina" })
    expect(
      tokens.some(
        (token) =>
          token.className === "heading" && token.value.includes("titulo")
      )
    ).toBe(false)
  })

  test("leaves a dashed block alone outside markdown", () => {
    const code = "---\nname: x\n---\n"

    expect(codeTokens(code, "diagram")).toEqual([{ value: code }])
  })
})
