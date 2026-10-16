import { z } from "zod"

const skill = z.object({
  name: z
    .string()
    .describe(
      "Published name: the platform skill's own, or `<slug>-<name>` for a content repository's"
    ),
  repository: z
    .object({ slug: z.string(), name: z.string() })
    .nullable()
    .describe("The content repository it comes from; null for the platform's"),
  description: z.string().describe("When an agent should use it"),
  path: z
    .string()
    .describe(
      "Where the web serves its SKILL.md (`/.well-known/agent-skills/<name>/SKILL.md`)"
    ),
  digest: z
    .string()
    .describe("`sha256:` and the hex SHA-256 of the SKILL.md text served"),
})

export const skillsOutput = {
  list: z.object({ skills: z.array(skill) }),
  get: z.object({
    name: z.string(),
    text: z
      .string()
      .describe(
        "The SKILL.md, with a content skill's front matter `name` set to its published name"
      ),
  }),
}
