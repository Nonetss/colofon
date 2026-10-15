import { auth } from "@nonete/auth"
import { createMiddleware } from "hono/factory"

export type AuthVariables = {
  user: typeof auth.$Infer.Session.user | null
  session: typeof auth.$Infer.Session.session | null
}

export const sessionMiddleware = createMiddleware<{ Variables: AuthVariables }>(
  async (c, next) => {
    // Better Auth resolves the session itself for its own routes (the
    // frontend's SSR `get-session` lookup included), and they are outside the
    // activity log, so resolving it here too would only double the work.
    // Git requests to the hosted repositories never carry a session.
    if (c.req.path.startsWith("/api/auth/") || c.req.path.startsWith("/git/")) {
      c.set("user", null)
      c.set("session", null)
      await next()
      return
    }

    const session = await auth.api.getSession({
      headers: c.req.raw.headers,
    })
    c.set("user", session?.user ?? null)
    c.set("session", session?.session ?? null)
    await next()
  }
)

export const requireAuth = createMiddleware<{ Variables: AuthVariables }>(
  async (c, next) => {
    const user = c.get("user")
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401)
    }
    await next()
  }
)

export const requireAdmin = createMiddleware<{ Variables: AuthVariables }>(
  async (c, next) => {
    const user = c.get("user")
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401)
    }
    if (user.role !== "admin") {
      return c.json({ error: "Forbidden" }, 403)
    }
    await next()
  }
)
