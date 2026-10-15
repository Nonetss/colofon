import { CORS_ORIGIN } from "astro:env/server"
import type { APIRoute } from "astro"
import { llmsIndex, textResponse } from "@/features/docs/llm-text"
import { createServerClient } from "@/lib/orpc-server"
import { publicOrigin } from "@/lib/public-origin"

// `/llms.txt` (https://llmstxt.org): every repository's pages as links to
// their `llm.txt`, for an AI to find its way through the documentation.
export const GET: APIRoute = async ({ request, url }) => {
  const nav = await createServerClient(request).v1.docs.nav()
  return textResponse(
    llmsIndex(nav.repositories, publicOrigin(CORS_ORIGIN, url))
  )
}
