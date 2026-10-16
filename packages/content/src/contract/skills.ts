import type { Dirent } from "node:fs"
import { readdir, readFile } from "node:fs/promises"
import path from "node:path"
import { parseDocument } from "yaml"
import type { PageProblem } from "#contract/problems"

// Reads a content repository's `skills/` (`content-contract`): one folder per
// skill holding its `SKILL.md`, in the Agent Skills format (front matter with
// `name` and `description`, then the instructions). A broken skill is
// reported and left out; the others are still read. The platform's own
// skills (`packages/api/skills/`) are read with the same rules.

/** The folder of the skills, under the content root. */
export const SKILLS_DIR = "skills"

/** The file each skill folder holds. */
export const SKILL_FILE = "SKILL.md"

/** Longest skill name, and longest description. */
export const MAX_SKILL_NAME = 64
const MAX_DESCRIPTION = 1024

const NAME = /^[a-z0-9]+(-[a-z0-9]+)*$/
const FRONT_MATTER = /^---\r?\n([\s\S]*?)\r?\n---(\r?\n|$)/

/** A valid skill: its name, its description and its file's text. */
export type ContentSkill = { name: string; description: string; text: string }

export type RepositorySkills = {
  /** The valid skills, by name. */
  skills: ContentSkill[]
  problems: PageProblem[]
}

/** Whether `name` is a skill name: lowercase words joined by single hyphens. */
export function isSkillName(name: string): boolean {
  return name.length <= MAX_SKILL_NAME && NAME.test(name)
}

/**
 * `text` with its front matter's `name` set to `name`, every other byte kept:
 * how a skill is published under another name than its folder's.
 */
export function withSkillName(text: string, name: string): string {
  const header = FRONT_MATTER.exec(text)
  if (header === null) return text
  const block = header[0]
  const renamed = block.replace(/^name:.*$/m, `name: ${name}`)
  return `${renamed}${text.slice(block.length)}`
}

/** The skills under `root`'s `skills/`. */
export async function readSkills(root: string): Promise<RepositorySkills> {
  const folder = path.join(root, SKILLS_DIR)
  const skills: ContentSkill[] = []
  const problems: PageProblem[] = []
  for (const entry of await listEntries(folder)) {
    const file = `${SKILLS_DIR}/${entry.name}`
    if (!entry.isDirectory()) {
      problems.push(
        problem(
          file,
          "Solo puede haber carpetas de skills, cada una con su SKILL.md"
        )
      )
      continue
    }
    if (!isSkillName(entry.name)) {
      problems.push(
        problem(
          file,
          `El nombre de una skill son letras minúsculas, cifras y guiones sueltos, de ${MAX_SKILL_NAME} caracteres como mucho`
        )
      )
      continue
    }
    const read = await readSkill(folder, entry.name, `${file}/${SKILL_FILE}`)
    if ("problem" in read) {
      problems.push(read.problem)
      continue
    }
    skills.push(read.skill)
  }
  return { skills, problems }
}

function problem(file: string, message: string): PageProblem {
  return { file, line: null, message }
}

type SkillRead = { skill: ContentSkill } | { problem: PageProblem }

async function readSkill(
  folder: string,
  name: string,
  file: string
): Promise<SkillRead> {
  const text = await readText(path.join(folder, name, SKILL_FILE))
  if (text === null)
    return { problem: problem(file, `Falta el ${SKILL_FILE} de la skill`) }
  const header = FRONT_MATTER.exec(text)?.[1]
  if (header === undefined)
    return {
      problem: problem(
        file,
        "Debe empezar con una cabecera YAML entre líneas --- con name y description"
      ),
    }
  const document = parseDocument(header)
  const [error] = document.errors
  if (error !== undefined)
    return {
      problem: problem(file, `La cabecera no es YAML válido: ${error.message}`),
    }
  const data: unknown = document.toJS()
  const declared = fieldOf(data, "name")
  if (declared !== name)
    return {
      problem: problem(
        file,
        `name debe ser «${name}», el nombre de su carpeta`
      ),
    }
  const description = fieldOf(data, "description")
  if (description === null || description.trim() === "")
    return {
      problem: problem(
        file,
        "Falta description, el texto que dice cuándo usarla"
      ),
    }
  if (description.length > MAX_DESCRIPTION)
    return {
      problem: problem(
        file,
        `description pasa de ${MAX_DESCRIPTION} caracteres`
      ),
    }
  return { skill: { name, description, text } }
}

/** A text field of the front matter, or null when it isn't one. */
function fieldOf(data: unknown, key: string): string | null {
  if (typeof data !== "object" || data === null) return null
  const value: unknown = Reflect.get(data, key)
  if (typeof value !== "string") return null
  return value
}

/** The file's text, or null when it isn't a readable file. */
async function readText(file: string): Promise<string | null> {
  try {
    return await readFile(file, "utf8")
  } catch (error) {
    if (isMissing(error)) return null
    throw error
  }
}

function isMissing(error: unknown): boolean {
  if (!(error instanceof Error) || !("code" in error)) return false
  return error.code === "ENOENT" || error.code === "EISDIR"
}

/** The visible entries of `folder`, by name; none when it doesn't exist. */
async function listEntries(folder: string): Promise<Dirent[]> {
  try {
    const entries = await readdir(folder, { withFileTypes: true })
    return entries
      .filter((entry) => !entry.name.startsWith("."))
      .sort((a, b) => a.name.localeCompare(b.name))
  } catch (error) {
    if (isMissing(error)) return []
    throw error
  }
}
