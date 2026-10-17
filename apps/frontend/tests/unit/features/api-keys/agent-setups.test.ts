import { describe, expect, test } from "bun:test"
import { agentPrompt } from "@/features/api-keys/manage/model/agent-prompt"
import { agentSetups } from "@/features/api-keys/manage/model/agent-setups"
import { skillsPrompt } from "@/features/api-keys/manage/model/skills-prompt"

const origin = "https://doc.example.com"
const key = "sk_secret"

describe("agentSetups", () => {
  const setups = agentSetups(origin, key)

  test("offers the setup prompt first, then the MCP clients and the plain instructions last", () => {
    expect(setups.map((setup) => setup.id)).toEqual([
      "skills",
      "claude-code",
      "codex",
      "json",
      "prompt",
    ])
  })

  test("every text carries the key", () => {
    for (const setup of setups) expect(setup.text).toContain(key)
  })

  test("the first one is the setup prompt with the key", () => {
    expect(setups[0]?.text).toBe(skillsPrompt(origin, key))
  })

  test("the last one is the prompt for an agent without MCP", () => {
    expect(setups.at(-1)?.text).toBe(agentPrompt(origin, key))
  })
})
