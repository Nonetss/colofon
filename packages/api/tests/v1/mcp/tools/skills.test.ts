import { describe, expect, test } from "bun:test"
import { ORPCError } from "@orpc/server"
import {
  casaDeploy,
  colofon,
  colofonDiagrams,
  fakeDocs,
  origin,
  text,
} from "#tests/v1/mcp/tools/helpers"
import { skillsTool, skillTool } from "#v1/mcp/tools/skills"

describe("skillsTool", () => {
  test("lists each skill with its owner, description, address and files", async () => {
    const { docs, skills } = fakeDocs({
      skillList: [colofon, colofonDiagrams, casaDeploy],
    })
    const result = await skillsTool({ docs, skills, origin })
    expect(text(result)).toBe(
      [
        "- `colofon` (the platform's): Cómo usar el sitio. https://docs.example.org/.well-known/agent-skills/colofon/SKILL.md",
        "- `colofon-diagrams` (the platform's): Cómo dibujar diagramas. https://docs.example.org/.well-known/agent-skills/colofon-diagrams/SKILL.md",
        "  Files: `references/type-bar.md`, `references/type-line.md`",
        "- `casa-deploy` (Casa's): Cómo se despliega. https://docs.example.org/.well-known/agent-skills/casa-deploy/SKILL.md",
        "",
        "Call skill with a name for its SKILL.md, or with a name and one of its files' paths for that file. To install them all, follow the setup procedure in the site's /llms.txt.",
      ].join("\n")
    )
    expect(result.structuredContent).toEqual({
      skills: [
        {
          name: "colofon",
          repository: null,
          description: "Cómo usar el sitio.",
          url: "https://docs.example.org/.well-known/agent-skills/colofon/SKILL.md",
          files: [],
        },
        {
          name: "colofon-diagrams",
          repository: null,
          description: "Cómo dibujar diagramas.",
          url: "https://docs.example.org/.well-known/agent-skills/colofon-diagrams/SKILL.md",
          files: ["references/type-bar.md", "references/type-line.md"],
        },
        {
          name: "casa-deploy",
          repository: "casa",
          description: "Cómo se despliega.",
          url: "https://docs.example.org/.well-known/agent-skills/casa-deploy/SKILL.md",
          files: [],
        },
      ],
    })
  })
})

describe("skillTool", () => {
  test("is the skill's text as the procedure returns it", async () => {
    const { docs, skills } = fakeDocs({ skillList: [colofon] })
    const result = await skillTool({
      docs,
      skills,
      origin,
      input: { name: "colofon" },
    })
    expect(result.isError).toBeUndefined()
    expect(text(result)).toBe("text of colofon")
  })

  test("an unknown skill is an error pointing at skills", async () => {
    const { docs, skills } = fakeDocs({ skillList: [colofon] })
    const result = await skillTool({
      docs,
      skills,
      origin,
      input: { name: "no-existe" },
    })
    expect(result.isError).toBe(true)
    expect(text(result)).toBe(
      'There is no skill "no-existe" you can read. Call skills to list them.'
    )
  })

  test("with a path, is that file's text", async () => {
    const { docs, skills } = fakeDocs({ skillList: [colofonDiagrams] })
    const result = await skillTool({
      docs,
      skills,
      origin,
      input: { name: "colofon-diagrams", path: "references/type-bar.md" },
    })
    expect(result.isError).toBeUndefined()
    expect(text(result)).toBe("references/type-bar.md text")
  })

  test("an unknown path is an error listing the skill's files", async () => {
    const { docs, skills } = fakeDocs({ skillList: [colofonDiagrams] })
    const result = await skillTool({
      docs,
      skills,
      origin,
      input: { name: "colofon-diagrams", path: "references/no.md" },
    })
    expect(result.isError).toBe(true)
    expect(text(result)).toBe(
      'The skill "colofon-diagrams" has no file "references/no.md". Its files: `SKILL.md`, `references/type-bar.md`, `references/type-line.md`.'
    )
  })

  test("a path on an unknown skill is an error pointing at skills", async () => {
    const { docs, skills } = fakeDocs({ skillList: [colofon] })
    const result = await skillTool({
      docs,
      skills,
      origin,
      input: { name: "no-existe", path: "references/x.md" },
    })
    expect(result.isError).toBe(true)
    expect(text(result)).toContain("Call skills to list them.")
  })

  test("other failures are not hidden", async () => {
    const { docs, skills } = fakeDocs()
    skills.get = async () => {
      throw new ORPCError("INTERNAL_SERVER_ERROR")
    }
    await expect(
      skillTool({ docs, skills, origin, input: { name: "colofon" } })
    ).rejects.toBeInstanceOf(ORPCError)
  })
})
