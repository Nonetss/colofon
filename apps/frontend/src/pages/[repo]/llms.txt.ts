import { CORS_ORIGIN } from "astro:env/server"
import type { APIRoute } from "astro"
import {
  repositoryLlmsIndex,
  textNotFound,
  textResponse,
} from "@/features/docs/llm-text"
import { createServerClient } from "@/lib/orpc-server"
import { publicOrigin } from "@/lib/public-origin"

// `/<slug>/llms.txt`: `/llms.txt` for one repository. An unknown repository
// or one without readable content is a 404.
export const GET: APIRoute = async ({ params, request, url }) => {
  const nav = await createServerClient(request).v1.docs.nav()
  const repository = nav.repositories.find(
    (entry) => entry.slug === params.repo && entry.available
  )
  if (repository === undefined) return textNotFound()
  return textResponse(
    repositoryLlmsIndex(repository, publicOrigin(CORS_ORIGIN, url))
  )
}
