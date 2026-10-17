import { describe, expect, test } from "bun:test"
import path from "node:path"
import { readSkillsWithFiles } from "@nonete/content"

// The platform's own skills follow the same rules as a content repository's,
// so a broken one fails here instead of at startup. They live in two roots:
// `packages/api/skills/` (`colofon`) and `doc-example/.agents/skills/` (the
// writing skills, whose only copy that is).

const API_ROOT = path.resolve(import.meta.dir, "../../..")
const WRITING_ROOT = path.resolve(API_ROOT, "../../doc-example/.agents")

describe("platform skills", () => {
  test("colofon is valid and is a single SKILL.md", async () => {
    const read = await readSkillsWithFiles(API_ROOT)
    expect(read.problems).toEqual([])
    expect(read.skills.map((skill) => [skill.name, skill.files])).toEqual([
      ["colofon", []],
    ])
  })

  test("the writing skills are valid and all named colofon-*", async () => {
    const read = await readSkillsWithFiles(WRITING_ROOT)
    expect(read.problems).toEqual([])
    expect(read.skills.map((skill) => skill.name)).toEqual([
      "colofon-catalog",
      "colofon-check",
      "colofon-diagrams",
      "colofon-docs",
      "colofon-documentation",
      "colofon-new-diagram",
      "colofon-new-page",
      "colofon-pending",
      "colofon-questions",
      "colofon-review",
      "colofon-skills",
      "colofon-styles",
    ])
  })

  test("every reference a writing skill links to is one of its files", async () => {
    const read = await readSkillsWithFiles(WRITING_ROOT)
    for (const skill of read.skills) {
      const files = new Set(skill.files.map((file) => file.path))
      const linked = [...skill.text.matchAll(/\]\((references\/[^)#\s]+)\)/g)]
      for (const [, target] of linked)
        expect({
          skill: skill.name,
          target,
          found: files.has(target ?? ""),
        }).toEqual({ skill: skill.name, target, found: true })
    }
  })
})
