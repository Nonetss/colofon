import path from "node:path"
import { openapi } from "@orpc/openapi"
import { publicProcedure } from "#index"
import { contentReader, repositoryStore } from "#v1/content/handler"
import { createSkillsHandler } from "#v1/skills/handler"
import { skillsInput } from "#v1/skills/input"
import { skillsOutput } from "#v1/skills/output"

// The platform's skills live in `packages/api/skills/`, found from the
// backend's working directory (`apps/backend`, also in its image) as the
// migrations are.
const skillsHandler = createSkillsHandler({
  reader: contentReader,
  repositories: repositoryStore,
  platformRoot: path.resolve(process.cwd(), "../../packages/api"),
})

const tags = ["Skills"]

export const skillsRouter = {
  list: publicProcedure
    .meta(
      openapi({
        summary: "List the agent skills",
        description:
          "The Agent Skills the caller can see: the platform's own (for everyone, signed in or not), then, with a session or API key, the skills of every content repository the reader shows that user, named `<slug>-<name>`. Each comes with the address the web serves its SKILL.md at and the SHA-256 digest of that text.",
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
}
