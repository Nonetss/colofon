import { describe, expect, test } from "bun:test"
import path from "node:path"
import { readSkills } from "@nonete/content"

// The platform's own skills (`packages/api/skills/`) follow the same rules as
// a content repository's, so a broken one fails here instead of at startup.

const API_ROOT = path.resolve(import.meta.dir, "../../..")

describe("platform skills", () => {
  test("every one is valid", async () => {
    const read = await readSkills(API_ROOT)
    expect(read.problems).toEqual([])
    expect(read.skills.map((skill) => skill.name)).toEqual([
      "colofon",
      "doc-writing",
    ])
  })
})
