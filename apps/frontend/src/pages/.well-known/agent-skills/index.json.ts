import { CORS_ORIGIN } from "astro:env/server"
import type { APIRoute } from "astro"
import { skillsIndexResponse } from "@/features/docs/llm-text"
import { createServerClient } from "@/lib/orpc-server"
import { publicOrigin } from "@/lib/public-origin"

// `/.well-known/agent-skills/index.json` (Agent Skills discovery): the skills
// the caller can see, the platform's for everyone and, with a credential,
// each content repository's.
export const GET: APIRoute = async ({ request, url }) => {
  const { skills } = await createServerClient(request).v1.skills.list()
  return skillsIndexResponse(skills, publicOrigin(CORS_ORIGIN, url))
}
