import type { AppRouterClient } from "@nonete/api/router"
import { createORPCClient } from "@orpc/client"
import { RPCLink } from "@orpc/client/fetch"

// The oRPC client Astro frontmatter uses to render content on the server
// (the documentation reader). It calls the backend directly, not through the
// gateway, and carries the visitor's cookies so the backend sees the session
// the middleware already checked. Islands never use it: they read through
// TanStack Query in the browser (`lib/orpc.ts`).

/** The request headers the backend needs: only the visitor's cookies. */
export function forwardedHeaders(request: Pick<Request, "headers">): Headers {
  const headers = new Headers()
  const cookie = request.headers.get("cookie")
  if (cookie !== null) headers.set("cookie", cookie)
  return headers
}

/**
 * Every call goes out as `QUERY`: this client only reads, and the backend
 * refuses `QUERY` on a procedure that writes, so a write fails loudly.
 */
export function createServerLink(
  backendUrl: string,
  request: Pick<Request, "headers">
) {
  return new RPCLink({
    url: "/rpc",
    origin: backendUrl,
    method: () => "QUERY",
    headers: () => forwardedHeaders(request),
  })
}

export function createServerClientFor(
  backendUrl: string,
  request: Pick<Request, "headers">
): AppRouterClient {
  return createORPCClient(createServerLink(backendUrl, request))
}
