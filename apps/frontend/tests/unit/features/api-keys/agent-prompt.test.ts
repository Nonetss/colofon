import { describe, expect, test } from "bun:test"
import { agentPrompt } from "@/features/api-keys/manage/model/agent-prompt"

describe("agentPrompt", () => {
  const prompt = agentPrompt("https://doc.example.com", "sk_secret")

  test("points the agent at the site's llms.txt", () => {
    expect(prompt).toContain("https://doc.example.com/llms.txt")
  })

  test("tells it to send the key in the x-api-key header", () => {
    expect(prompt).toContain("x-api-key: sk_secret")
  })
})
