import type { APIRoute } from "astro"
import { skillFileResponse, skillNotFound } from "@/features/docs/llm-text"
import { isMissing } from "@/features/docs/shared"
import { createServerClient } from "@/lib/orpc-server"

// `/.well-known/agent-skills/<name>/<path>`: one file of a skill the caller
// can see, its `SKILL.md` (the bytes a `skill-md` digest covers) or one of its
// references. Any other name or path is a 404.
export const GET: APIRoute = async ({ params, request }) => {
  const file = await createServerClient(request)
    .v1.skills.file({ name: params.name ?? "", path: params.path ?? "" })
    .catch((error: unknown) => {
      if (isMissing(error)) return undefined
      throw error
    })
  if (file === undefined) return skillNotFound()
  return skillFileResponse(file.text, file.path)
}
