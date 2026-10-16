import { CORS_ORIGIN } from "astro:env/server"
import type { APIRoute } from "astro"
import { llmsGuide, llmsIndex, textResponse } from "@/features/docs/llm-text"
import { createServerClient } from "@/lib/orpc-server"
import { publicOrigin } from "@/lib/public-origin"

// `/llms.txt` (https://llmstxt.org): the agent's way in. Without a credential
// it is only the guide (the key, the MCP, the platform's skills); with one,
// the guide and every repository's pages, as links to their `llm.txt`, and
// skills.
export const GET: APIRoute = async ({ locals, request, url }) => {
  const client = createServerClient(request)
  const origin = publicOrigin(CORS_ORIGIN, url)
  const { skills } = await client.v1.skills.list()
  if (locals.user === null) return textResponse(llmsGuide(skills, origin))
  const nav = await client.v1.docs.nav()
  return textResponse(llmsIndex(nav.repositories, skills, origin))
}
