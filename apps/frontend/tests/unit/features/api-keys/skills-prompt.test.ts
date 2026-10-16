import { describe, expect, test } from "bun:test"
import {
  KEY_PLACEHOLDER,
  skillsPrompt,
} from "@/features/api-keys/manage/model/skills-prompt"

const origin = "https://doc.example.com"

describe("skillsPrompt", () => {
  test("points at the discovery index, the skills folder and llms.txt", () => {
    const text = skillsPrompt(origin)
    expect(text).toContain(
      "https://doc.example.com/.well-known/agent-skills/index.json"
    )
    expect(text).toContain("<nombre>/SKILL.md")
    expect(text).toContain("~/.claude/skills/")
    expect(text).toContain("digest")
    expect(text).toContain("https://doc.example.com/llms.txt")
  })

  test("without a key, says where it goes with a placeholder", () => {
    expect(skillsPrompt(origin)).toContain(`x-api-key: ${KEY_PLACEHOLDER}`)
  })

  test("with a key, carries it", () => {
    const text = skillsPrompt(origin, "sk_secret")
    expect(text).toContain("x-api-key: sk_secret")
    expect(text).not.toContain(KEY_PLACEHOLDER)
  })
})
