import { CORS_ORIGIN } from "astro:env/server"
import { withOrigin } from "@nonete/api/v1/docs/full-links"
import { pageMarkdown } from "@nonete/api/v1/docs/markdown"
import type { APIRoute } from "astro"
import { textNotFound, textResponse } from "@/features/docs/llm-text"
import { isMissing } from "@/features/docs/shared"
import { createServerClient } from "@/lib/orpc-server"
import { publicOrigin } from "@/lib/public-origin"

// `/<slug>/llm.txt` and `/<slug>/<page path>/llm.txt`: the page as Markdown,
// the same text "Copiar en Markdown" copies, so an AI reads it without the
// HTML. An unknown repository or page is a 404.
export const GET: APIRoute = async ({ params, request, url }) => {
  const client = createServerClient(request)
  const page = await client.v1.docs
    .page({ repository: params.repo ?? "", path: params.path ?? "" })
    .catch((error: unknown) => {
      if (isMissing(error)) return undefined
      throw error
    })
  if (page === undefined) return textNotFound()

  const markdown = pageMarkdown({
    title: page.header.title,
    description: page.header.description,
    tree: page.tree,
  })
  return textResponse(withOrigin(markdown, publicOrigin(CORS_ORIGIN, url)))
}
