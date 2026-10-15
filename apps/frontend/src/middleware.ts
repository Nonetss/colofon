import { defineMiddleware } from "astro:middleware"
import type { APIContext, MiddlewareNext } from "astro"
import { splitSetCookieHeader } from "better-auth/cookies"
import { authServer } from "@/lib/auth-server"
import { logger } from "@/lib/logger"

const publicPaths = ["/login", "/signup"]
const publicExactPaths = new Set(["/logo.svg"])
const adminPaths = ["/admin"]

function matchesPathSegment(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`)
}

function matchesAnyPathSegment(path: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => matchesPathSegment(path, prefix))
}

function appendRefreshedCookies(
  response: Response,
  refreshedCookies: readonly string[]
): Response {
  for (const cookie of refreshedCookies) {
    response.headers.append("set-cookie", cookie)
  }
  return response
}

export const onRequest = defineMiddleware((context, next) => {
  context.locals.session = null
  context.locals.user = null

  const path = context.url.pathname
  if (publicExactPaths.has(path) || matchesAnyPathSegment(path, publicPaths)) {
    return next()
  }

  return handleProtectedRequest(context, next)
})

async function handleProtectedRequest(
  context: APIContext,
  next: MiddlewareNext
): Promise<Response> {
  const path = context.url.pathname

  let refreshedCookies: string[] = []

  const sessionResult = await authServer.getSession({
    fetchOptions: {
      headers: context.request.headers,
      onResponse: (ctx) => {
        refreshedCookies = splitSetCookieHeader(
          ctx.response.headers.get("set-cookie") ?? ""
        )
      },
    },
  })

  if (sessionResult.error) {
    logger.error(
      {
        type: "auth_service_error",
        path,
        status: sessionResult.error.status,
        message: sessionResult.error.message,
      },
      "session resolution failed"
    )
    return appendRefreshedCookies(
      new Response("Service Unavailable", {
        status: 503,
        headers: { "cache-control": "no-store" },
      }),
      refreshedCookies
    )
  }

  if (sessionResult.data === null) {
    return appendRefreshedCookies(context.redirect("/login"), refreshedCookies)
  }

  const { user, session } = sessionResult.data

  context.locals.session = session
  context.locals.user = user

  if (matchesAnyPathSegment(path, adminPaths)) {
    if (user.role !== "admin") {
      return appendRefreshedCookies(context.redirect("/"), refreshedCookies)
    }
  }

  return appendRefreshedCookies(await next(), refreshedCookies)
}
