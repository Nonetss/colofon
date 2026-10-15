import type { AppRouterClient } from "@nonete/api/router"
import { createORPCClient } from "@orpc/client"
import { RPCLink } from "@orpc/client/fetch"

// The oRPC client Astro frontmatter uses to render content on the server
// (the documentation reader). It calls the backend directly, not through the
// gateway, and carries the visitor's cookies or API key so the backend sees
// the session the middleware already checked. Islands never use it: they read through
// TanStack Query in the browser (`lib/orpc.ts`).

/** The visitor's credentials: session cookies and an `x-api-key`. */
const CREDENTIAL_HEADERS = ["cookie", "x-api-key"]

/** The request headers the backend needs: only the visitor's credentials. */
export function forwardedHeaders(request: Pick<Request, "headers">): Headers {
  const headers = new Headers()
  for (const name of CREDENTIAL_HEADERS) {
    const value = request.headers.get(name)
    if (value !== null) headers.set(name, value)
  }
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
