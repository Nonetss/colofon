import { describe, expect, test } from "bun:test"
import type { DocsSkill } from "@nonete/api/v1/docs/llm-text"
import {
  skillArchiveResponse,
  skillFileResponse,
  skillNotFound,
  skillsIndexBody,
  skillsIndexResponse,
} from "@/features/docs/llm-text/model/skills-response"

const origin = "https://docs.example.org"

const colofon: DocsSkill = {
  name: "colofon",
  repository: null,
  description: "Cómo usar el sitio.",
  type: "skill-md",
  path: "/.well-known/agent-skills/colofon/SKILL.md",
  archivePath: null,
  files: [],
  digest: "sha256:abc",
}

const colofonDocs: DocsSkill = {
  name: "colofon-docs",
  repository: null,
  description: "Cómo escribir páginas.",
  type: "archive",
  path: "/.well-known/agent-skills/colofon-docs/SKILL.md",
  archivePath: "/.well-known/agent-skills/colofon-docs.tar.gz",
  files: ["references/header.md"],
  digest: "sha256:def",
}

describe("skillsIndexBody", () => {
  test("is the discovery draft's index, each url a full address", () => {
    expect(JSON.parse(skillsIndexBody([colofon, colofonDocs], origin))).toEqual(
      {
        $schema: "https://schemas.agentskills.io/discovery/0.2.0/schema.json",
        skills: [
          {
            name: "colofon",
            type: "skill-md",
            description: "Cómo usar el sitio.",
            url: "https://docs.example.org/.well-known/agent-skills/colofon/SKILL.md",
            digest: "sha256:abc",
          },
          {
            name: "colofon-docs",
            type: "archive",
            description: "Cómo escribir páginas.",
            url: "https://docs.example.org/.well-known/agent-skills/colofon-docs.tar.gz",
            digest: "sha256:def",
          },
        ],
      }
    )
  })
})

describe("skill responses", () => {
  test("are open to any origin and private to the credential", () => {
    for (const response of [
      skillsIndexResponse([colofon], origin),
      skillFileResponse("# colofon\n", "SKILL.md"),
      skillArchiveResponse(new File([new Uint8Array([1, 2])], "x.tar.gz")),
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
    const file = skillFileResponse("# colofon\n", "SKILL.md")
    expect(file.headers.get("content-type")).toBe(
      "text/markdown; charset=utf-8"
    )
    expect(await file.text()).toBe("# colofon\n")
    expect(skillNotFound().status).toBe(404)
  })

  test("a file that isn't Markdown is plain text", () => {
    expect(
      skillFileResponse("x", "scripts/run.sh").headers.get("content-type")
    ).toBe("text/plain; charset=utf-8")
  })

  test("an archive is gzip with its exact bytes", async () => {
    const response = skillArchiveResponse(
      new File([new Uint8Array([1, 2, 3])], "colofon-docs.tar.gz")
    )
    expect(response.headers.get("content-type")).toBe("application/gzip")
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(
      new Uint8Array([1, 2, 3])
    )
  })
})
