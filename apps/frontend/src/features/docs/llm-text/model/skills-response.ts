import type { DocsSkill } from "@nonete/api/v1/docs/llm-text"

// How the Agent Skills discovery routes answer (draft v0.2.0): the index as
// JSON and each skill as Markdown, readable from any origin, and never kept
// by a shared cache, since what they hold depends on the credential.

const SCHEMA = "https://schemas.agentskills.io/discovery/0.2.0/schema.json"

const COMMON_HEADERS = {
  "access-control-allow-origin": "*",
  "cache-control": "private, no-cache",
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
        type: "skill-md",
        description: skill.description,
        url: `${origin}${skill.path}`,
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

/** A skill route's answer: its `SKILL.md`, byte for byte. */
export function skillFileResponse(text: string): Response {
  return new Response(text, {
    headers: {
      ...COMMON_HEADERS,
      "content-type": "text/markdown; charset=utf-8",
    },
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
