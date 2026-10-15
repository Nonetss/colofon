import { BACKEND_URL } from "astro:env/server"
import type { AppRouterClient } from "@nonete/api/router"
import { createServerClientFor } from "@/lib/server-link"

/** oRPC client for Astro frontmatter, reading as the visitor of `request`. */
export function createServerClient(request: Request): AppRouterClient {
  return createServerClientFor(BACKEND_URL, request)
}
