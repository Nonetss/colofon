import { env } from "@nonete/env/server"
import type { AuthContext } from "better-auth"
import { APIError, createAuthMiddleware } from "better-auth/api"
import { genericOAuth } from "better-auth/plugins"

const PROVIDER_ID = "oidc"

// Upper bound for one discovery attempt. A request waits at most this long
// for the issuer; an attempt still running afterwards may finish in the
// background, but the next request starts a fresh one.
const DISCOVERY_TIMEOUT_MS = 5000

export function isOidcConfigured() {
  const { OIDC_CLIENT_ID, OIDC_CLIENT_SECRET, OIDC_DISCOVERY_URL } = env
  return Boolean(OIDC_CLIENT_ID && OIDC_CLIENT_SECRET && OIDC_DISCOVERY_URL)
}

function hasProvider(ctx: AuthContext) {
  return ctx.socialProviders.some((provider) => provider.id === PROVIDER_ID)
}

function settleWithin(promise: Promise<unknown>, ms: number) {
  return new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms)
    promise
      .catch(() => undefined)
      .finally(() => {
        clearTimeout(timer)
        resolve()
      })
  })
}

/**
 * The "oidc" provider from Better Auth's generic OAuth plugin, made resilient
 * to the issuer being down or slow.
 *
 * The plugin fetches the discovery document once, inside `init`, with no
 * timeout: a hanging issuer blocks the whole auth context (every session
 * lookup with it), and a failed fetch drops the provider until the backend
 * restarts. Here discovery runs outside `init`, bounded by a timeout, and is
 * retried on the next sign-in or callback until it succeeds; the provider is
 * then added to the context's shared `socialProviders` array.
 */
export function buildGenericOAuthPlugin() {
  const { OIDC_CLIENT_ID, OIDC_CLIENT_SECRET, OIDC_DISCOVERY_URL } = env
  if (!OIDC_CLIENT_ID || !OIDC_CLIENT_SECRET || !OIDC_DISCOVERY_URL) {
    return null
  }
  const plugin = genericOAuth({
    config: [
      {
        providerId: PROVIDER_ID,
        clientId: OIDC_CLIENT_ID,
        clientSecret: OIDC_CLIENT_SECRET,
        discoveryUrl: `${OIDC_DISCOVERY_URL}/.well-known/openid-configuration`,
        scopes: ["openid", "profile", "email"],
      },
    ],
  })

  let attempt: Promise<boolean> | undefined

  async function discover(ctx: AuthContext) {
    const result = await plugin.init(ctx)
    const provider = result.context.socialProviders.find(
      (candidate) => candidate.id === PROVIDER_ID
    )
    if (!provider || hasProvider(ctx)) return
    ctx.socialProviders.unshift(provider)
    ctx.logger.info(`OIDC provider "${PROVIDER_ID}" is ready`)
  }

  function ensureProvider(ctx: AuthContext) {
    if (hasProvider(ctx)) return Promise.resolve(true)
    if (attempt) return attempt
    const discovery = discover(ctx)
    discovery.catch((error) => {
      ctx.logger.error(`OIDC discovery failed: ${error}`)
    })
    attempt = settleWithin(discovery, DISCOVERY_TIMEOUT_MS).then(() => {
      attempt = undefined
      const ready = hasProvider(ctx)
      if (!ready) {
        ctx.logger.warn(
          `OIDC provider "${PROVIDER_ID}" is not available yet; discovery will be retried on the next sign-in`
        )
      }
      return ready
    })
    return attempt
  }

  return {
    ...plugin,
    init(ctx: AuthContext) {
      // Not awaited: the auth context never waits on the issuer.
      void ensureProvider(ctx)
    },
    hooks: {
      before: [
        {
          matcher: (ctx: { path?: string }) =>
            ctx.path === "/sign-in/social" || ctx.path === "/callback/:id",
          handler: createAuthMiddleware(async (ctx) => {
            if (await ensureProvider(ctx.context)) return
            if (ctx.path !== "/sign-in/social") return
            throw new APIError("SERVICE_UNAVAILABLE", {
              message:
                "El proveedor de SSO no responde. Inténtalo de nuevo en unos minutos.",
            })
          }),
        },
      ],
    },
  }
}
