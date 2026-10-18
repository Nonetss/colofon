import type { Dirent } from "node:fs"
import { readdir, readFile } from "node:fs/promises"
import path from "node:path"
import { parseDocument } from "yaml"
import type { PageProblem } from "#contract/read/problems"

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

/** A file of a skill besides its `SKILL.md`: its POSIX path in the folder and its text. */
export type SkillFile = { path: string; text: string }

/** A valid skill with every other file of its folder, sorted by path. */
export type SkillWithFiles = ContentSkill & { files: SkillFile[] }

export type SkillsWithFiles = {
  /** The valid skills, by name. */
  skills: SkillWithFiles[]
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

/**
 * The skills under `root`'s `skills/`, each with the other files of its folder
 * (`references/…`): how the platform's own skills are read. Dot-files and
 * symbolic links are skipped; a file that isn't UTF-8 text is reported and
 * left out. A content repository's skills are read with `readSkills`, whose
 * extra files the platform ignores.
 */
export async function readSkillsWithFiles(
  root: string
): Promise<SkillsWithFiles> {
  const read = await readSkills(root)
  const problems = [...read.problems]
  const skills: SkillWithFiles[] = []
  for (const skill of read.skills) {
    const files: SkillFile[] = []
    await collectFiles(
      path.join(root, SKILLS_DIR, skill.name),
      "",
      `${SKILLS_DIR}/${skill.name}`,
      files,
      problems
    )
    files.sort((a, b) => comparePaths(a.path, b.path))
    skills.push({ ...skill, files })
  }
  return { skills, problems }
}

const UTF8 = new TextDecoder("utf-8", { fatal: true })

async function collectFiles(
  folder: string,
  prefix: string,
  shown: string,
  files: SkillFile[],
  problems: PageProblem[]
): Promise<void> {
  for (const entry of await listEntries(path.join(folder, prefix))) {
    const relative = joinPosix(prefix, entry.name)
    if (entry.isDirectory()) {
      await collectFiles(folder, relative, shown, files, problems)
      continue
    }
    if (!entry.isFile()) continue
    if (relative === SKILL_FILE) continue
    const bytes = await readFile(path.join(folder, relative))
    const text = decodeUtf8(bytes)
    if (text === null) {
      problems.push(
        problem(
          `${shown}/${relative}`,
          "Solo puede tener ficheros de texto UTF-8"
        )
      )
      continue
    }
    files.push({ path: relative, text })
  }
}

function joinPosix(prefix: string, name: string): string {
  if (prefix === "") return name
  return `${prefix}/${name}`
}

function decodeUtf8(bytes: Uint8Array): string | null {
  try {
    return UTF8.decode(bytes)
  } catch {
    return null
  }
}

/** Code-point order, the same on every machine and locale. */
function comparePaths(a: string, b: string): number {
  if (a < b) return -1
  if (a > b) return 1
  return 0
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
