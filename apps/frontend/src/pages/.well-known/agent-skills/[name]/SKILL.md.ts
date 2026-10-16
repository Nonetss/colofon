import type { APIRoute } from "astro"
import { skillFileResponse, skillNotFound } from "@/features/docs/llm-text"
import { isMissing } from "@/features/docs/shared"
import { createServerClient } from "@/lib/orpc-server"

// `/.well-known/agent-skills/<name>/SKILL.md`: one skill the caller can see,
// as the index's digest covers it. Any other name is a 404.
export const GET: APIRoute = async ({ params, request }) => {
  const skill = await createServerClient(request)
    .v1.skills.get({ name: params.name ?? "" })
    .catch((error: unknown) => {
      if (isMissing(error)) return undefined
      throw error
    })
  if (skill === undefined) return skillNotFound()
  return skillFileResponse(skill.text)
}
