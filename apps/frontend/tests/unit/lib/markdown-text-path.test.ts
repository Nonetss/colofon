import { describe, expect, test } from "bun:test"
import {
  isMarkdownTextPath,
  isOptionalCredentialPath,
} from "@/lib/markdown-text-path"

describe("isMarkdownTextPath", () => {
  test("the global and repository indexes are text paths", () => {
    expect(isMarkdownTextPath("/llms.txt")).toBe(true)
    expect(isMarkdownTextPath("/casa/llms.txt")).toBe(true)
  })

  test("a page's or a repository home's llm.txt is a text path", () => {
    expect(isMarkdownTextPath("/casa/llm.txt")).toBe(true)
    expect(isMarkdownTextPath("/casa/red/dns/llm.txt")).toBe(true)
  })

  test("reader pages and look-alikes are not", () => {
    expect(isMarkdownTextPath("/casa/red/dns")).toBe(false)
    expect(isMarkdownTextPath("/llms.txt/x")).toBe(false)
    expect(isMarkdownTextPath("/casa/llm.txtx")).toBe(false)
    expect(isMarkdownTextPath("/llm.txt")).toBe(false)
    expect(isMarkdownTextPath("/casa/red/llms.txt")).toBe(false)
  })
})

describe("isOptionalCredentialPath", () => {
  test("the global index and the skills routes need no credential", () => {
    expect(isOptionalCredentialPath("/llms.txt")).toBe(true)
    expect(
      isOptionalCredentialPath("/.well-known/agent-skills/index.json")
    ).toBe(true)
    expect(
      isOptionalCredentialPath("/.well-known/agent-skills/casa-deploy/SKILL.md")
    ).toBe(true)
  })

  test("a skill's archive and each of its files need no credential", () => {
    for (const path of [
      "/.well-known/agent-skills/colofon-diagrams.tar.gz",
      "/.well-known/agent-skills/colofon-diagrams/references/type-bar.md",
      "/.well-known/agent-skills/colofon-docs/notas.md",
    ])
      expect(isOptionalCredentialPath(path)).toBe(true)
  })

  test("a repository's index, the pages and look-alikes still do", () => {
    for (const path of [
      "/casa/llms.txt",
      "/casa/red/dns/llm.txt",
      "/.well-known/agent-skills/",
      "/.well-known/agent-skills/../SKILL.md",
      "/.well-known/agent-skills/casa/../colofon/SKILL.md",
      "/.well-known/agent-skills/casa/./SKILL.md",
      "/.well-known/agent-skills/casa//SKILL.md",
      "/.well-known/agent-skills/casa/",
      "/.well-known/agent-skills/Casa.tar.gz",
      "/.well-known/agent-skills/casa.tar.gz/x",
      "/.well-known/other",
    ])
      expect(isOptionalCredentialPath(path)).toBe(false)
  })
})
