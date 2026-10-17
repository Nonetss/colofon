import path from "node:path"
import { openapi } from "@orpc/openapi"
import { publicProcedure } from "#index"
import { contentReader, repositoryStore } from "#v1/content/handler"
import { createSkillsHandler } from "#v1/skills/handler"
import { skillsInput } from "#v1/skills/input"
import { skillsOutput } from "#v1/skills/output"

// The platform's skills live in `packages/api/skills/` (`colofon`) and in
// `doc-example/.agents/skills/` (the writing skills, whose only copy that
// is), found from the backend's working directory (`apps/backend`, also in
// its image) as the migrations are.
const skillsHandler = createSkillsHandler({
  reader: contentReader,
  repositories: repositoryStore,
  platformRoots: [
    path.resolve(process.cwd(), "../../packages/api"),
    path.resolve(process.cwd(), "../../doc-example/.agents"),
  ],
})

const tags = ["Skills"]

export const skillsRouter = {
  list: publicProcedure
    .meta(
      openapi({
        summary: "List the agent skills",
        description:
          "The Agent Skills the caller can see: the platform's own (for everyone, signed in or not), then, with a session or API key, the skills of every content repository the reader shows that user, named `<slug>-<name>`. Each comes with its type (`skill-md`, or `archive` for a platform skill with other files), the addresses the web serves its SKILL.md, archive and files at, and the SHA-256 digest of what installs it.",
        tags,
        method: "GET",
      })
    )
    .output(skillsOutput.list)
    .handler(({ context }) => skillsHandler.list({ context })),

  get: publicProcedure
    .meta(
      openapi({
        summary: "Read an agent skill",
        description:
          "One skill's SKILL.md by its published name, with a content skill's front matter `name` set to that name. NOT_FOUND for a name the caller can't see: an unknown one, or a content repository's without a session or API key.",
        tags,
        method: "GET",
      })
    )
    .input(skillsInput.get)
    .output(skillsOutput.get)
    .handler(({ context, input }) => skillsHandler.get({ context, input })),

  file: publicProcedure
    .meta(
      openapi({
        summary: "Read a file of an agent skill",
        description:
          "One file of a skill by its path inside the skill's folder: `SKILL.md`, or one of the `files` that `list` gives. NOT_FOUND for a skill the caller can't see or a path the skill doesn't hold.",
        tags,
        method: "GET",
      })
    )
    .input(skillsInput.file)
    .output(skillsOutput.file)
    .handler(({ context, input }) => skillsHandler.file({ context, input })),

  archive: publicProcedure
    .meta(
      openapi({
        summary: "Download an agent skill's archive",
        description:
          "The tar.gz of a platform skill with files besides its SKILL.md, its files at the archive's root. The same files always give the same bytes, which the listing's digest covers. NOT_FOUND for a skill the caller can't see or one served as a single SKILL.md.",
        tags,
        method: "GET",
      })
    )
    .input(skillsInput.get)
    .output(skillsOutput.archive)
    .handler(({ context, input }) => skillsHandler.archive({ context, input })),
}
