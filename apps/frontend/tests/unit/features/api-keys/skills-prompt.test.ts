import { describe, expect, test } from "bun:test"
import {
  KEY_PLACEHOLDER,
  skillsPrompt,
} from "@/features/api-keys/manage/model/skills-prompt"

const origin = "https://doc.example.com"

describe("skillsPrompt", () => {
  test("asks the AI to set itself up with the procedure in llms.txt", () => {
    const text = skillsPrompt(origin)
    expect(text).toContain("https://doc.example.com")
    expect(text).toContain("https://doc.example.com/llms.txt")
    expect(text).toContain("Configurar tu agente")
  })

  test("is short: the steps live in llms.txt, not here", () => {
    const text = skillsPrompt(origin)
    expect(text.split("\n").length).toBeLessThanOrEqual(8)
    expect(text).not.toContain("index.json")
  })

  test("without a key, says where it goes with a placeholder", () => {
    const text = skillsPrompt(origin)
    expect(text).toContain(`x-api-key: ${KEY_PLACEHOLDER}`)
    expect(text).toContain("solo")
  })

  test("with a key, carries it and no placeholder", () => {
    const text = skillsPrompt(origin, "sk_secret")
    expect(text).toContain("x-api-key: sk_secret")
    expect(text).not.toContain(KEY_PLACEHOLDER)
  })
})
