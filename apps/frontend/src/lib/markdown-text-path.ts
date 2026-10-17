// The routes that serve the documentation as Markdown for an AI: the
// `llms.txt` indexes (global and per repository) and every page's `llm.txt`.
// The middleware answers them 401 instead of sending to the login page. A few
// of them, the agent's way in, answer without a credential too: `/llms.txt`
// (the guide) and the Agent Skills discovery routes (the platform's skills:
// the index, each skill's files and its archive).

const INDEX_FILE = "/llms.txt"
const PAGE_FILE = "/llm.txt"

/** Whether `path` is `/llms.txt`, `/<repo>/llms.txt` or `<page>/llm.txt`. */
export function isMarkdownTextPath(path: string): boolean {
  if (path === INDEX_FILE) return true
  const segments = path.split("/")
  if (path.endsWith(INDEX_FILE)) return segments.length === 3
  if (path.endsWith(PAGE_FILE)) return segments.length >= 3
  return false
}

const SKILLS_ROOT = "/.well-known/agent-skills/"
const SKILLS_INDEX = `${SKILLS_ROOT}index.json`
const SKILL_ARCHIVE = /^[a-z0-9-]+\.tar\.gz$/
const SKILL_NAME = /^[a-z0-9-]+$/
const FILE_SEGMENT = /^[A-Za-z0-9._-]+$/

/**
 * Whether `path` answers with or without a credential: `/llms.txt`, the skills
 * index, a skill's archive and any file of a skill (its `SKILL.md`, its
 * references). With one, they show more.
 */
export function isOptionalCredentialPath(path: string): boolean {
  if (path === INDEX_FILE || path === SKILLS_INDEX) return true
  if (!path.startsWith(SKILLS_ROOT)) return false
  const rest = path.slice(SKILLS_ROOT.length)
  if (SKILL_ARCHIVE.test(rest)) return true
  const [name, ...file] = rest.split("/")
  if (name === undefined || !SKILL_NAME.test(name)) return false
  return file.length > 0 && file.every(isFileSegment)
}

function isFileSegment(segment: string): boolean {
  if (segment === "." || segment === "..") return false
  return FILE_SEGMENT.test(segment)
}
