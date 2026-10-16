import { CORS_ORIGIN } from "astro:env/server"
import type { APIRoute } from "astro"
import {
  repositoryLlmsIndex,
  textNotFound,
  textResponse,
} from "@/features/docs/llm-text"
import { createServerClient } from "@/lib/orpc-server"
import { publicOrigin } from "@/lib/public-origin"

// `/<slug>/llms.txt`: `/llms.txt` for one repository, its skills included. An unknown repository
// or one without readable content is a 404.
export const GET: APIRoute = async ({ params, request, url }) => {
  const client = createServerClient(request)
  const nav = await client.v1.docs.nav()
  const repository = nav.repositories.find(
    (entry) => entry.slug === params.repo && entry.available
  )
  if (repository === undefined) return textNotFound()
  const { skills } = await client.v1.skills.list()
  return textResponse(
    repositoryLlmsIndex(repository, skills, publicOrigin(CORS_ORIGIN, url))
  )
}
