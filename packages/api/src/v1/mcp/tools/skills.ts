import type { CallToolResult } from "@modelcontextprotocol/server"
import { z } from "zod"
import type { DocsSkill } from "#v1/docs/llm-text"
import { errorResult, isMissing, textResult } from "#v1/mcp/results"
import type { ToolScope } from "#v1/mcp/scope"

// The skills tools: what skills the caller can install, and one skill's
// SKILL.md or one of its files, read through `v1.skills` as the caller.

export const skillInput = z.object({
  name: z
    .string()
    .min(1)
    .describe(
      "Name of the skill, as skills lists it (`colofon`, `casa-deploy`)"
    ),
  path: z
    .string()
    .min(1)
    .optional()
    .describe(
      "Path of one of the skill's files, as skills lists them (`references/type-bar.md`); its SKILL.md when missing"
    ),
})

/** What `skills` returns as structured content. */
export const skillsOutput = z.object({
  skills: z.array(
    z.object({
      name: z.string(),
      repository: z
        .string()
        .nullable()
        .describe(
          "Slug of the repository it comes from; null for the platform's"
        ),
      description: z.string(),
      url: z.string().describe("Full address of its SKILL.md"),
      files: z
        .array(z.string())
        .describe(
          "Paths of its files besides SKILL.md, each readable with skill and a path; empty for a single-file skill"
        ),
    })
  ),
})

type SkillSummary = z.infer<typeof skillsOutput>["skills"][number]

function skillSummary(skill: DocsSkill, origin: string): SkillSummary {
  return {
    name: skill.name,
    repository: repositorySlug(skill),
    description: skill.description,
    url: `${origin}${skill.path}`,
    files: skill.files,
  }
}

function repositorySlug(skill: DocsSkill): string | null {
  if (skill.repository === null) return null
  return skill.repository.slug
}

function ownerOf(skill: DocsSkill): string {
  if (skill.repository === null) return "the platform's"
  return `${skill.repository.name}'s`
}

/** One skill as `skills` lists it, with its files when it has any. */
function skillLine(skill: DocsSkill, origin: string): string {
  const line = `- \`${skill.name}\` (${ownerOf(skill)}): ${skill.description} ${origin}${skill.path}`
  if (skill.files.length === 0) return line
  return `${line}\n  Files: ${skill.files.map((file) => `\`${file}\``).join(", ")}`
}

/** `skills`: every skill the caller can see, as the discovery index lists them. */
export async function skillsTool({
  skills,
  origin,
}: ToolScope): Promise<CallToolResult> {
  const listed = await skills.list()
  const summaries = listed.skills.map((skill) => skillSummary(skill, origin))
  const lines = listed.skills.map((skill) => skillLine(skill, origin))
  return {
    ...textResult(
      [
        ...lines,
        "",
        "Call skill with a name for its SKILL.md, or with a name and one of its files' paths for that file. To install them all, follow the setup procedure in the site's /llms.txt.",
      ].join("\n")
    ),
    structuredContent: { skills: summaries },
  }
}

/**
 * `skill`: one skill's SKILL.md, or one of its files with `path`, as its
 * route serves it to the caller.
 */
export async function skillTool({
  skills,
  input,
}: ToolScope & {
  input: { name: string; path?: string | undefined }
}): Promise<CallToolResult> {
  const missingSkill = `There is no skill "${input.name}" you can read. Call skills to list them.`
  if (input.path === undefined) {
    try {
      const skill = await skills.get({ name: input.name })
      return textResult(skill.text)
    } catch (error) {
      if (!isMissing(error)) throw error
      return errorResult(missingSkill)
    }
  }
  const listed = await skills.list()
  const skill = listed.skills.find((entry) => entry.name === input.name)
  if (skill === undefined) return errorResult(missingSkill)
  try {
    const file = await skills.file({ name: input.name, path: input.path })
    return textResult(file.text)
  } catch (error) {
    if (!isMissing(error)) throw error
    return errorResult(missingFile(skill, input.path))
  }
}

function missingFile(skill: DocsSkill, path: string): string {
  const files = ["SKILL.md", ...skill.files].map((file) => `\`${file}\``)
  return `The skill "${skill.name}" has no file "${path}". Its files: ${files.join(", ")}.`
}
