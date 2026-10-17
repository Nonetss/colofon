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
  type: z
    .enum(["skill-md", "archive"])
    .describe(
      "`skill-md` for a skill that is only its SKILL.md; `archive` for a platform skill with other files, installed from its archive"
    ),
  path: z
    .string()
    .describe(
      "Where the web serves its SKILL.md (`/.well-known/agent-skills/<name>/SKILL.md`)"
    ),
  archivePath: z
    .string()
    .nullable()
    .describe(
      "Where the web serves its tar.gz archive (`/.well-known/agent-skills/<name>.tar.gz`); null for a `skill-md` skill"
    ),
  files: z
    .array(z.string())
    .describe(
      "Paths of its files besides SKILL.md, each served at `/.well-known/agent-skills/<name>/<path>`; empty for a `skill-md` skill"
    ),
  digest: z
    .string()
    .describe(
      "`sha256:` and the hex SHA-256 of what installs it: the SKILL.md text for `skill-md`, the archive's bytes for `archive`"
    ),
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
  file: z.object({
    name: z.string(),
    path: z.string(),
    text: z
      .string()
      .describe("The file's text, exactly as its route serves it"),
  }),
  archive: z.file().describe("The skill's tar.gz archive"),
}
