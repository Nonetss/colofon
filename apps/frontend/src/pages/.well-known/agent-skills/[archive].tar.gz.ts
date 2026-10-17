import type { APIRoute } from "astro"
import { skillArchiveResponse, skillNotFound } from "@/features/docs/llm-text"
import { isMissing } from "@/features/docs/shared"
import { createServerClient } from "@/lib/orpc-server"

// `/.well-known/agent-skills/<name>.tar.gz`: the archive of a platform skill
// with files besides its SKILL.md, the bytes the index's digest covers. A
// skill served as a single SKILL.md, or one the caller can't see, is a 404.
export const GET: APIRoute = async ({ params, request }) => {
  const archive = await createServerClient(request)
    .v1.skills.archive({ name: params.archive ?? "" })
    .catch((error: unknown) => {
      if (isMissing(error)) return undefined
      throw error
    })
  if (archive === undefined) return skillNotFound()
  return skillArchiveResponse(archive)
}
