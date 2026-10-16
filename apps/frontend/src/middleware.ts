import { CORS_ORIGIN } from "astro:env/server"
import { defineMiddleware } from "astro:middleware"
import type { APIContext, MiddlewareNext } from "astro"
import { splitSetCookieHeader } from "better-auth/cookies"
import { authServer } from "@/lib/auth-server"
import { logger } from "@/lib/logger"
import {
  isMarkdownTextPath,
  isOptionalCredentialPath,
} from "@/lib/markdown-text-path"
import { publicOrigin } from "@/lib/public-origin"

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

function isRefusedCredential(status: number): boolean {
  return status === 401 || status === 403
}

function unauthorizedText(origin: string): Response {
  return new Response(
    `Inicia sesión o envía una API key en la cabecera x-api-key. Cómo conseguirla, el MCP y las skills: ${origin}/llms.txt\n`,
    {
      status: 401,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
      },
    }
  )
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

  // A refused credential (an unknown or disabled `x-api-key`) is a visitor
  // without a session, not an auth outage.
  if (sessionResult.error && !isRefusedCredential(sessionResult.error.status)) {
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
    // The agent's way in answers anyway, showing only what needs no key.
    if (isOptionalCredentialPath(path))
      return appendRefreshedCookies(await next(), refreshedCookies)
    // An agent reading the Markdown routes gets told why, not a login page.
    if (isMarkdownTextPath(path))
      return appendRefreshedCookies(
        unauthorizedText(publicOrigin(CORS_ORIGIN, context.url)),
        refreshedCookies
      )
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
