import { defineMiddleware } from "astro:middleware"
import { injectTraceHeaders, withServerSpan } from "@nonete/telemetry/span"
import type { APIContext, MiddlewareNext } from "astro"
import { splitSetCookieHeader } from "better-auth/cookies"
import { authServer } from "@/lib/auth-server"
import { logger } from "@/lib/logger"
import { FRONTEND_TRACER } from "@/lib/telemetry"

const publicPaths = ["/login", "/signup"]
const publicExactPaths = new Set(["/logo.svg"])
const adminPaths = ["/admin"]

function matchesPathSegment(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`)
}

function matchesAnyPathSegment(path: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => matchesPathSegment(path, prefix))
}

// Browsers tag speculative loads (Astro's hover/viewport/tap prefetch,
// <link rel="prefetch">, speculation rules) with Sec-Purpose — legacy
// implementations use Purpose instead — so they're otherwise
// indistinguishable from a real navigation by path/method alone.
function isPrefetchRequest(headers: Headers): boolean {
  const secPurpose = headers.get("sec-purpose")?.toLowerCase() ?? ""
  const purpose = headers.get("purpose")?.toLowerCase() ?? ""
  return secPurpose.includes("prefetch") || purpose.includes("prefetch")
}

// Page views follow browser navigation semantics rather than URL spelling:
// dynamic page parameters may contain dots, while API routes may not. Astro's
// client router fetches HTML without Sec-Fetch-Dest, so Accept is the fallback.
function isPageView(method: string, headers: Headers): boolean {
  if (method !== "GET" || isPrefetchRequest(headers)) return false

  const destination = headers.get("sec-fetch-dest")?.toLowerCase()
  if (destination) return destination === "document"

  return headers.get("accept")?.toLowerCase().includes("text/html") ?? false
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

function logPageView({
  user,
  method,
  path,
  status,
  latencyMs,
}: {
  user: { id: string; email: string }
  method: string
  path: string
  status: number
  latencyMs: number
}) {
  const fields = {
    type: "page_view",
    method,
    path,
    status,
    latencyMs,
    userId: user.id,
    email: user.email,
  }
  if (status >= 500) {
    logger.error(fields, "page view")
  } else if (status >= 400) {
    logger.warn(fields, "page view")
  } else {
    logger.info(fields, "page view")
  }
}

export const onRequest = defineMiddleware((context, next) => {
  context.locals.session = null
  context.locals.user = null

  const path = context.url.pathname
  if (publicExactPaths.has(path) || matchesAnyPathSegment(path, publicPaths)) {
    return next()
  }

  // One SERVER span per protected request, named after the route pattern
  // (`GET /admin/traces/[traceId]`), so the session lookup below and the
  // backend's spans for it land in the same trace. Public paths stay out.
  return withServerSpan(FRONTEND_TRACER, context.request, (span) => {
    const prefetch = isPrefetchRequest(context.request.headers)
    span.updateName(serverSpanName(context, prefetch))
    span.setAttribute("http.route", context.routePattern)
    span.setAttribute("http.request.prefetch", prefetch)
    return handleProtectedRequest(context, next)
  })
})

// A hover prefetch is rendered in full, so it keeps its trace, but under its
// own name: the click that follows is a second request with a second trace,
// and the list would otherwise show both as the same page load.
function serverSpanName(context: APIContext, prefetch: boolean): string {
  const name = `${context.request.method} ${context.routePattern}`
  if (prefetch) return `${name} (prefetch)`
  return name
}

async function handleProtectedRequest(
  context: APIContext,
  next: MiddlewareNext
): Promise<Response> {
  const start = performance.now()
  const path = context.url.pathname
  const method = context.request.method

  let refreshedCookies: string[] = []

  const sessionResult = await authServer.getSession({
    fetchOptions: {
      // The trace context goes along, so the backend continues this trace.
      headers: injectTraceHeaders(
        Object.fromEntries(context.request.headers.entries())
      ),
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

  const trackPageView = isPageView(method, context.request.headers)

  const response = await next()

  if (trackPageView) {
    const latencyMs = Number((performance.now() - start).toFixed(2))
    logPageView({ user, method, path, status: response.status, latencyMs })
  }

  return appendRefreshedCookies(response, refreshedCookies)
}
