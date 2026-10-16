import {
  createMcpHandler,
  type McpHttpHandler,
  type McpRequestContext,
} from "@modelcontextprotocol/server"
import type { McpScope } from "#v1/mcp/secret-tools"
import { createDocsMcpServer } from "#v1/mcp/server"

// The `/mcp` endpoint's handler: one per process, serving each request with a
// fresh server (stateless, the current protocol revision plus the 2025-era
// fallback). The SDK builds that server in a factory that only sees the
// request (a clone of it, once the body is read) and the `authInfo` it was
// handed, so the caller's scope waits in a map under a one-off key passed as
// `authInfo.token`. The factory takes it out; whatever the SDK answers without
// building a server (a GET, a bad body) is removed when `serveMcp` returns.

type McpState = {
  handler: McpHttpHandler
  scopes: Map<string, McpScope>
}

// `bun --hot` re-runs this module: keeping the handler on globalThis leaves a
// single one for shutdown to close.
declare global {
  var __docsMcp: McpState | undefined
}

function state(): McpState {
  const existing = globalThis.__docsMcp
  if (existing) return existing
  const scopes = new Map<string, McpScope>()
  const created: McpState = {
    scopes,
    handler: createMcpHandler((context) =>
      createDocsMcpServer(takeScope(scopes, context))
    ),
  }
  globalThis.__docsMcp = created
  return created
}

function takeScope(
  scopes: Map<string, McpScope>,
  context: McpRequestContext
): McpScope {
  const key = context.authInfo?.token
  if (key === undefined) throw new Error("MCP request without its scope key")
  const scope = scopes.get(key)
  if (scope === undefined)
    throw new Error("MCP request that did not come through serveMcp")
  scopes.delete(key)
  return scope
}

/**
 * Answers one `/mcp` request with tools reading through `scope`: the caller's
 * client and the public origin. The caller must be authenticated already.
 */
export async function serveMcp(
  request: Request,
  scope: McpScope
): Promise<Response> {
  const { handler, scopes } = state()
  // Not a credential: only the key of this request's scope in the map.
  const key = crypto.randomUUID()
  scopes.set(key, scope)
  try {
    return await handler.fetch(request, {
      authInfo: { token: key, clientId: "colofon", scopes: [] },
    })
  } finally {
    scopes.delete(key)
  }
}

/** Ends the MCP exchanges still open, for the backend's shutdown. */
export async function closeMcp(): Promise<void> {
  const existing = globalThis.__docsMcp
  if (existing === undefined) return
  await existing.handler.close()
}
