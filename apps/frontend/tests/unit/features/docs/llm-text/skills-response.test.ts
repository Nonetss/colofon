import { describe, expect, test } from "bun:test"
import {
  skillFileResponse,
  skillNotFound,
  skillsIndexBody,
  skillsIndexResponse,
} from "@/features/docs/llm-text/model/skills-response"

const origin = "https://docs.example.org"

const colofon = {
  name: "colofon",
  repository: null,
  description: "Cómo usar el sitio.",
  path: "/.well-known/agent-skills/colofon/SKILL.md",
  digest: "sha256:abc",
}

describe("skillsIndexBody", () => {
  test("is the discovery draft's index, each url a full address", () => {
    expect(JSON.parse(skillsIndexBody([colofon], origin))).toEqual({
      $schema: "https://schemas.agentskills.io/discovery/0.2.0/schema.json",
      skills: [
        {
          name: "colofon",
          type: "skill-md",
          description: "Cómo usar el sitio.",
          url: "https://docs.example.org/.well-known/agent-skills/colofon/SKILL.md",
          digest: "sha256:abc",
        },
      ],
    })
  })
})

describe("skill responses", () => {
  test("are open to any origin and private to the credential", () => {
    for (const response of [
      skillsIndexResponse([colofon], origin),
      skillFileResponse("# colofon\n"),
      skillNotFound(),
    ]) {
      expect(response.headers.get("access-control-allow-origin")).toBe("*")
      expect(response.headers.get("cache-control")).toBe("private, no-cache")
    }
  })

  test("the index is JSON, a skill Markdown with its bytes, and a miss a 404", async () => {
    expect(
      skillsIndexResponse([colofon], origin).headers.get("content-type")
    ).toBe("application/json")
    const file = skillFileResponse("# colofon\n")
    expect(file.headers.get("content-type")).toBe(
      "text/markdown; charset=utf-8"
    )
    expect(await file.text()).toBe("# colofon\n")
    expect(skillNotFound().status).toBe(404)
  })
})
