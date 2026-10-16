import { describe, expect, test } from "bun:test"
import { agentPrompt } from "@/features/api-keys/manage/model/agent-prompt"
import { agentSetups } from "@/features/api-keys/manage/model/agent-setups"

const origin = "https://doc.example.com"
const key = "sk_secret"

describe("agentSetups", () => {
  const setups = agentSetups(origin, key)

  test("offers the MCP clients first and the plain instructions last", () => {
    expect(setups.map((setup) => setup.id)).toEqual([
      "claude-code",
      "codex",
      "json",
      "prompt",
    ])
  })

  test("every text carries the key", () => {
    for (const setup of setups) expect(setup.text).toContain(key)
  })

  test("the last one is the prompt for an agent without MCP", () => {
    expect(setups.at(-1)?.text).toBe(agentPrompt(origin, key))
  })
})
