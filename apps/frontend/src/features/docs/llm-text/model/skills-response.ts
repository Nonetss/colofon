import type { DocsSkill } from "@nonete/api/v1/docs/llm-text"

// How the Agent Skills discovery routes answer (draft v0.2.0): the index as
// JSON, each skill's files as text and a skill's archive as gzip, readable
// from any origin, and never kept by a shared cache, since what they hold
// depends on the credential.

const SCHEMA = "https://schemas.agentskills.io/discovery/0.2.0/schema.json"

const COMMON_HEADERS = {
  "access-control-allow-origin": "*",
  "cache-control": "private, no-cache",
}

/** What an entry's `url` installs: the archive, or the SKILL.md. */
function installPath(skill: DocsSkill): string {
  if (skill.archivePath !== null) return skill.archivePath
  return skill.path
}

/** The discovery index of `skills`, each `url` a full address on `origin`. */
export function skillsIndexBody(
  skills: readonly DocsSkill[],
  origin: string
): string {
  return `${JSON.stringify(
    {
      $schema: SCHEMA,
      skills: skills.map((skill) => ({
        name: skill.name,
        type: skill.type,
        description: skill.description,
        url: `${origin}${installPath(skill)}`,
        digest: skill.digest,
      })),
    },
    null,
    2
  )}\n`
}

/** The index route's answer. */
export function skillsIndexResponse(
  skills: readonly DocsSkill[],
  origin: string
): Response {
  return new Response(skillsIndexBody(skills, origin), {
    headers: { ...COMMON_HEADERS, "content-type": "application/json" },
  })
}

/** A skill file route's answer: the file at `path`, byte for byte. */
export function skillFileResponse(text: string, path: string): Response {
  return new Response(text, {
    headers: { ...COMMON_HEADERS, "content-type": fileContentType(path) },
  })
}

function fileContentType(path: string): string {
  if (path.endsWith(".md")) return "text/markdown; charset=utf-8"
  return "text/plain; charset=utf-8"
}

/** A skill archive route's answer: the tar.gz the index's digest covers. */
export function skillArchiveResponse(archive: File): Response {
  return new Response(archive, {
    headers: { ...COMMON_HEADERS, "content-type": "application/gzip" },
  })
}

/** A skill route's answer for a name the caller can't see. */
export function skillNotFound(): Response {
  return new Response("No existe esa skill.\n", {
    status: 404,
    headers: {
      ...COMMON_HEADERS,
      "content-type": "text/plain; charset=utf-8",
    },
  })
}
