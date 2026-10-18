import { originValidationResponse } from "@modelcontextprotocol/server"
import { createContext } from "@nonete/api/context"
import { appRouter } from "@nonete/api/router"
import { executeRequest, serveMcp } from "@nonete/api/server"
import { env } from "@nonete/env/server"
import { createRouterClient } from "@orpc/server"
import { Hono } from "hono"
import type { AuthVariables } from "@/middlewares/auth"

// The documentation MCP (`/mcp`), for agents. The session middleware has
// already turned an `x-api-key` header (or a session cookie) into the user;
// the tools then call the API's procedures as that user, so they see what the
// reader shows them and manage that user's repositories as the profile page
// does, and `request` sends with that user's secrets. Outside oRPC: MCP speaks
// its own JSON-RPC.

const publicUrl = new URL(env.CORS_ORIGIN)

// The same answer as the frontend's Markdown routes.
const UNAUTHORIZED_TEXT =
  "Inicia sesión o envía una API key en la cabecera x-api-key.\n"

/**
 * The id of the API key a request came with, for the secrets usage log, or
 * null for a browser session. Better Auth's API-key plugin builds the key's
 * session with the key's id as the session id.
 */
function apiKeyIdOf(
  request: Request,
  session: AuthVariables["session"]
): string | null {
  if (!request.headers.has("x-api-key") || session === null) return null
  return session.id
}

const router = new Hono<{ Variables: AuthVariables }>()

router.all("/mcp", async (c) => {
  // A browser page on another site can't drive the tools with the cookie.
  const rejected = originValidationResponse(c.req.raw, [publicUrl.hostname])
  if (rejected) return rejected

  const user = c.get("user")
  if (!user)
    return c.text(UNAUTHORIZED_TEXT, 401, { "cache-control": "no-store" })

  const context = await createContext({
    context: c,
    request: c.get("requestScope"),
  })
  const client = createRouterClient(appRouter, { context })
  return serveMcp(c.req.raw, {
    docs: client.v1.docs,
    skills: client.v1.skills,
    secrets: {
      list: client.v1.secret.list,
      request: (input) =>
        executeRequest(
          {
            userId: user.id,
            apiKeyId: apiKeyIdOf(c.req.raw, c.get("session")),
          },
          input
        ),
    },
    content: client.v1.content,
    credentials: client.v1.gitCredential,
    origin: publicUrl.origin,
  })
})

export default router
