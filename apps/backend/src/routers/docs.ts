import { type Context, createContext } from "@nonete/api/context"
import { appRouter } from "@nonete/api/router"
import { SCHEMAS_PATH } from "@nonete/api/server"
import { SmartCoercionHandlerPlugin } from "@orpc/json-schema"
import { OpenAPIGenerator } from "@orpc/openapi"
import { OpenAPIHandler } from "@orpc/openapi/fetch"
import { OpenAPIReferenceHandlerPlugin } from "@orpc/openapi/plugins"
import { GetMethodCsrfProtectionHandlerPlugin } from "@orpc/server/plugins"
import { ZodToJsonSchemaConverter } from "@orpc/zod"
import { Hono } from "hono"
import { requireAdmin } from "@/middlewares/auth"
import {
  eventStreamResponseOptions,
  hardeningPlugins,
  loggingPlugin,
  responseHeadersPlugin,
} from "@/routers/handler-plugins"

// Relative on purpose: /scalar is served through the frontend's origin (Caddy
// in prod, Vite in dev), which also serves /logo.svg.
const docsHead = `<link rel="icon" href="/logo.svg" type="image/svg+xml">`

const generator = new OpenAPIGenerator({
  converters: [new ZodToJsonSchemaConverter()],
})

// Built on each docs request, as v1 did: only admins reach /scalar and
// /openapi.json, so caching the document isn't worth the extra state.
const generateSpec = () =>
  generator.generate(appRouter, {
    version: "3.2.0",
    base: {
      servers: [{ url: "/api" }],
      info: {
        title: "Colofon API",
        version: "1.0.0",
        summary:
          "The API of colofon, a self-hosted documentation platform: content repositories and their pages, catalog and diagrams, search, agent skills, secrets, API keys, users, organizations and crons.",
        contact: {
          name: "Nonete",
          email: "amorenolopezbarajas@pm.me",
          url: "https://github.com/Nonetss",
        },
        description:
          "Every procedure the web app uses, under /api with REST paths. Calls authenticate with the session cookie or an API key in the x-api-key header; the documentation MCP is served apart at /mcp.",
      },
      security: [{ ApiKey: [] }, { BearerAuth: [] }],
      components: {
        securitySchemes: {
          ApiKey: {
            type: "apiKey",
            in: "header",
            name: "x-api-key",
            description: "API key — pass your key in the x-api-key header",
          },
          BearerAuth: {
            type: "http",
            scheme: "bearer",
            description: "Session token — pass your session token as Bearer",
          },
        },
      },
    },
  })

// Two handlers on purpose: the reference plugin serves `${prefix}/scalar` and
// `${prefix}/openapi.json` for whatever prefix the handler runs under, so a
// handler shared with /api would also answer /api/scalar and /api/openapi.json
// outside the requireAdmin gate below. The gate stays in Hono rather than the
// plugin's `allow`, which answers 404 instead of 401/403.
const docsHandler = new OpenAPIHandler(appRouter, {
  plugins: [
    new OpenAPIReferenceHandlerPlugin({
      provider: "scalar",
      docsPath: "/scalar",
      specPath: "/openapi.json",
      docsHead,
      spec: generateSpec,
    }),
    loggingPlugin(),
  ],
})

// Shared by both /api handlers. Query and path values arrive as strings;
// SmartCoercion turns them into the type the input schema declares (e.g.
// `limit` to a number) before validation. /rpc doesn't need it: its
// serializer keeps the types.
const apiPlugins = () => [
  new SmartCoercionHandlerPlugin({
    converters: [new ZodToJsonSchemaConverter()],
  }),
  loggingPlugin(),
  ...hardeningPlugins(),
  responseHeadersPlugin(),
]

const apiHandler = new OpenAPIHandler(appRouter, {
  plugins: [
    // /api is called both by browsers on the session cookie and by external
    // clients on an API key or bearer token. Unsafe methods are covered by the
    // SameSite=Lax session cookie; this rejects the one cross-site request a
    // browser still sends it on: a top-level GET navigation. Server-to-server
    // calls (API-key clients) carry no Fetch Metadata and pass.
    new GetMethodCsrfProtectionHandlerPlugin(),
    ...apiPlugins(),
  ],
  toFetchResponse: eventStreamResponseOptions,
})

// The content schema endpoints are public, read-only and never use the
// session, so there is nothing to forge: they skip the CSRF plugin, which
// would refuse a catalog URL opened from the address bar or from a link
// outside the browser (Sec-Fetch-Site `none` or `cross-site`).
const contentSchemasHandler = new OpenAPIHandler(appRouter, {
  plugins: apiPlugins(),
})

const router = new Hono()

/** Answers what `handler` matches under `prefix`, and passes the rest on. */
function openApiMiddleware(
  handler: OpenAPIHandler<Context>,
  prefix: `/${string}`
): Parameters<typeof router.use>[1] {
  return async (c, next) => {
    const context = await createContext({
      context: c,
      request: c.get("requestScope"),
    })
    const result = await handler.handle(c.req.raw, { prefix, context })
    if (result.matched)
      return c.newResponse(result.response.body, result.response)
    await next()
  }
}

const docsMiddleware = openApiMiddleware(docsHandler, "/")
router.use("/scalar", requireAdmin, docsMiddleware)
router.use("/scalar/*", requireAdmin, docsMiddleware)
router.use("/openapi.json", requireAdmin, docsMiddleware)

// Registered first: a content schema request is answered by its own handler,
// and only a path under it that matches no procedure falls through to /api.
router.use(
  `${SCHEMAS_PATH}/*`,
  openApiMiddleware(contentSchemasHandler, "/api")
)
router.use("/api/*", openApiMiddleware(apiHandler, "/api"))

export default router
