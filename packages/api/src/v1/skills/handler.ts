import { createHash } from "node:crypto"
import {
  type ContentSkill,
  MAX_SKILL_NAME,
  readSkillsWithFiles,
  SKILL_FILE,
  type SkillWithFiles,
  withSkillName,
} from "@nonete/content"
import type { z } from "zod"
import type { Context } from "#context"
import { errors } from "#errors"
import {
  audienceOfUser,
  type ContentReader,
  type RepositoryAudience,
  type RepositoryStore,
} from "#v1/content/reader"
import { buildTarGz } from "#v1/skills/archive"
import type { skillsInput } from "#v1/skills/input"
import type { skillsOutput } from "#v1/skills/output"

// The Agent Skills the site serves (`agent-skills`): the platform's own, the
// same on every site and for every caller, and, for a signed-in caller, the
// skills of the content repositories the reader shows them, published as
// `<slug>-<name>`. A platform skill with files besides its SKILL.md is also
// served as a tar.gz archive, built once per process. The web serves them
// under `/.well-known/agent-skills/`.

const SKILL_NOT_FOUND = "Skill no encontrada"
const FILE_NOT_FOUND = "Fichero no encontrado en esa skill"
const ARCHIVE_NOT_FOUND = "Esa skill no se sirve como archivo"

type ListOutput = z.infer<typeof skillsOutput.list>
type ListedSkill = ListOutput["skills"][number]
type GetOutput = z.infer<typeof skillsOutput.get>
type FileOutput = z.infer<typeof skillsOutput.file>

/** A skill as served: its listing entry, its texts and its archive. */
type ServedSkill = ListedSkill & {
  text: string
  /** Every file's text by path, `SKILL.md` included. */
  texts: ReadonlyMap<string, string>
  archive: Uint8Array | null
}

export type SkillsHandlerOptions = {
  reader: ContentReader
  repositories: RepositoryStore
  /** The folders whose `skills/` hold the platform's skills. */
  platformRoots: readonly string[]
}

const ROUTE = "/.well-known/agent-skills"

/** Where the web serves a skill's file. */
function skillPath(name: string): string {
  return `${ROUTE}/${name}/${SKILL_FILE}`
}

/** Where the web serves a skill's archive. */
function skillArchivePath(name: string): string {
  return `${ROUTE}/${name}.tar.gz`
}

function digestOf(bytes: string | Uint8Array): string {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`
}

/** A content skill: only its SKILL.md, with `name` set to `name`. */
function servedContent(
  skill: ContentSkill,
  name: string,
  repository: ListedSkill["repository"]
): ServedSkill {
  const text = withSkillName(skill.text, name)
  return {
    name,
    repository,
    description: skill.description,
    type: "skill-md",
    path: skillPath(name),
    archivePath: null,
    files: [],
    digest: digestOf(text),
    text,
    texts: new Map([[SKILL_FILE, text]]),
    archive: null,
  }
}

/** A platform skill: an archive when it holds other files. */
function servedPlatform(skill: SkillWithFiles): ServedSkill {
  const texts = new Map([[SKILL_FILE, skill.text]])
  for (const file of skill.files) texts.set(file.path, file.text)
  const listed = {
    name: skill.name,
    repository: null,
    description: skill.description,
    path: skillPath(skill.name),
    files: skill.files.map((file) => file.path),
    text: skill.text,
    texts,
  }
  if (skill.files.length === 0)
    return {
      ...listed,
      type: "skill-md",
      archivePath: null,
      digest: digestOf(skill.text),
      archive: null,
    }
  const archive = buildTarGz(
    [...texts].map(([path, content]) => ({ path, content }))
  )
  return {
    ...listed,
    type: "archive",
    archivePath: skillArchivePath(skill.name),
    digest: digestOf(archive),
    archive,
  }
}

function listed(skill: ServedSkill): ListedSkill {
  return {
    name: skill.name,
    repository: skill.repository,
    description: skill.description,
    type: skill.type,
    path: skill.path,
    archivePath: skill.archivePath,
    files: skill.files,
    digest: skill.digest,
  }
}

/**
 * Every root's skills, ordered by name. A broken skill or a name in two
 * roots fails, as the platform test does, rather than serving half of them.
 */
async function readPlatform(roots: readonly string[]): Promise<ServedSkill[]> {
  const skills: SkillWithFiles[] = []
  for (const root of roots) {
    const read = await readSkillsWithFiles(root)
    const [problem] = read.problems
    if (problem !== undefined)
      throw new Error(
        `Broken platform skill ${problem.file}: ${problem.message}`
      )
    skills.push(...read.skills)
  }
  const names = new Set<string>()
  for (const skill of skills) {
    if (names.has(skill.name))
      throw new Error(`Platform skill ${skill.name} is in two roots`)
    names.add(skill.name)
  }
  skills.sort((a, b) => compareNames(a.name, b.name))
  return skills.map(servedPlatform)
}

function compareNames(a: string, b: string): number {
  if (a < b) return -1
  if (a > b) return 1
  return 0
}

export function createSkillsHandler({
  reader,
  repositories,
  platformRoots,
}: SkillsHandlerOptions) {
  // Read once per process; a broken platform skill fails its unit test, so
  // only valid ones are here.
  const platform = readPlatform(platformRoots)

  /** The content repositories' skills, in the reader's repository order. */
  async function contentSkills(
    taken: ReadonlySet<string>,
    audience: RepositoryAudience
  ) {
    const skills: ServedSkill[] = []
    for (const stored of await repositories.list(audience)) {
      const read = await reader.site(stored.slug, audience)
      if (read?.site === undefined) continue
      const repository = { slug: stored.slug, name: stored.name }
      for (const skill of read.site.skills) {
        const name = `${stored.slug}-${skill.name}`
        if (name.length > MAX_SKILL_NAME || taken.has(name)) continue
        skills.push(servedContent(skill, name, repository))
      }
    }
    return skills
  }

  /** Every skill `context`'s caller can see: the content ones need a user. */
  async function visible(context: Context): Promise<ServedSkill[]> {
    const own = await platform
    if (context.user === null) return own
    const names = new Set(own.map((skill) => skill.name))
    return [
      ...own,
      ...(await contentSkills(
        names,
        await audienceOfUser(context.user, repositories)
      )),
    ]
  }

  /** The skill named `name` that `context`'s caller can see. */
  async function find(context: Context, name: string): Promise<ServedSkill> {
    const skills = await visible(context)
    const found = skills.find((skill) => skill.name === name)
    if (found === undefined)
      throw errors.NOT_FOUND({ message: SKILL_NOT_FOUND })
    return found
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
      const found = await find(context, input.name)
      return { name: found.name, text: found.text }
    },

    async file({
      context,
      input,
    }: {
      context: Context
      input: z.infer<typeof skillsInput.file>
    }): Promise<FileOutput> {
      const found = await find(context, input.name)
      const text = found.texts.get(input.path)
      if (text === undefined)
        throw errors.NOT_FOUND({ message: FILE_NOT_FOUND })
      return { name: found.name, path: input.path, text }
    },

    async archive({
      context,
      input,
    }: {
      context: Context
      input: z.infer<typeof skillsInput.get>
    }): Promise<File> {
      const found = await find(context, input.name)
      if (found.archive === null)
        throw errors.NOT_FOUND({ message: ARCHIVE_NOT_FOUND })
      return new File([found.archive], `${found.name}.tar.gz`, {
        type: "application/gzip",
      })
    },
  }
}
