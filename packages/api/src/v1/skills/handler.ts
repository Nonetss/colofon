import { createHash } from "node:crypto"
import {
  type ContentSkill,
  MAX_SKILL_NAME,
  readSkills,
  withSkillName,
} from "@nonete/content"
import type { z } from "zod"
import type { Context } from "#context"
import { errors } from "#errors"
import type { ContentReader, RepositoryStore } from "#v1/content/reader"
import type { skillsInput } from "#v1/skills/input"
import type { skillsOutput } from "#v1/skills/output"

// The Agent Skills the site serves (`agent-skills`): the platform's own, the
// same on every site and for every caller, and, for a signed-in caller, the
// skills of the content repositories the reader shows them, published as
// `<slug>-<name>`. The web serves them under `/.well-known/agent-skills/`.

const SKILL_NOT_FOUND = "Skill no encontrada"

type ListOutput = z.infer<typeof skillsOutput.list>
type GetOutput = z.infer<typeof skillsOutput.get>

/** A skill as served: its listing entry and the exact text. */
type ServedSkill = ListOutput["skills"][number] & { text: string }

export type SkillsHandlerOptions = {
  reader: ContentReader
  repositories: RepositoryStore
  /** The folder whose `skills/` holds the platform's skills. */
  platformRoot: string
}

/** Where the web serves a skill's file. */
export function skillPath(name: string): string {
  return `/.well-known/agent-skills/${name}/SKILL.md`
}

function digestOf(text: string): string {
  return `sha256:${createHash("sha256").update(text, "utf8").digest("hex")}`
}

function served(
  skill: ContentSkill,
  name: string,
  repository: ServedSkill["repository"]
): ServedSkill {
  const text = withSkillName(skill.text, name)
  return {
    name,
    repository,
    description: skill.description,
    path: skillPath(name),
    digest: digestOf(text),
    text,
  }
}

function listed(skill: ServedSkill): ListOutput["skills"][number] {
  return {
    name: skill.name,
    repository: skill.repository,
    description: skill.description,
    path: skill.path,
    digest: skill.digest,
  }
}

export function createSkillsHandler({
  reader,
  repositories,
  platformRoot,
}: SkillsHandlerOptions) {
  // Read once per process; a broken platform skill fails its unit test, so
  // only valid ones are here.
  const platform = readSkills(platformRoot).then((read) =>
    read.skills.map((skill) => served(skill, skill.name, null))
  )

  /** The content repositories' skills, in the reader's repository order. */
  async function contentSkills(taken: ReadonlySet<string>) {
    const skills: ServedSkill[] = []
    for (const stored of await repositories.list()) {
      const read = await reader.site(stored.slug)
      if (read?.site === undefined) continue
      const repository = { slug: stored.slug, name: stored.name }
      for (const skill of read.site.skills) {
        const name = `${stored.slug}-${skill.name}`
        if (name.length > MAX_SKILL_NAME || taken.has(name)) continue
        skills.push(served(skill, name, repository))
      }
    }
    return skills
  }

  /** Every skill `context`'s caller can see: the content ones need a user. */
  async function visible(context: Context): Promise<ServedSkill[]> {
    const own = await platform
    if (context.user === null) return own
    const names = new Set(own.map((skill) => skill.name))
    return [...own, ...(await contentSkills(names))]
  }

  return {
    async list({ context }: { context: Context }): Promise<ListOutput> {
      const skills = await visible(context)
      return { skills: skills.map(listed) }
    },

    async get({
      context,
      input,
    }: {
      context: Context
      input: z.infer<typeof skillsInput.get>
    }): Promise<GetOutput> {
      const skills = await visible(context)
      const found = skills.find((skill) => skill.name === input.name)
      if (found === undefined)
        throw errors.NOT_FOUND({ message: SKILL_NOT_FOUND })
      return { name: found.name, text: found.text }
    },
  }
}
