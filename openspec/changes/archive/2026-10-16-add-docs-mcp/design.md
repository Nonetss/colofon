## Context

- `x-api-key` already becomes a session: Better Auth's API-key plugin runs with `enableSessionForAPIKeys`, and the backend's `sessionMiddleware` (`apps/backend/src/middlewares/auth.ts`) resolves it on every route except `/api/auth/*` and `/git/*`. A new Hono route gets `user`/`session` for free.
- The tools' data comes from `v1.docs` (`packages/api/src/v1/docs/router.ts`): `nav` (repositories and their trees), `page` (header plus sanitized hast tree) and `search`. All three are `protectedProcedure`, and that is where per-repository permissions will be enforced (`TODO.md` 2).
- The Markdown an agent reads today is built in the frontend:
  - `features/docs/page/model/markdown.ts` (`pageMarkdown`, hast → Markdown with `hast-util-to-mdast` and `mdast-util-to-markdown`).
  - `features/docs/page/model/full-links.ts` (`withOrigin`). The browser copy script (`page-scripts.ts`) imports it on its own so the Markdown writer stays out of the client bundle.
  - `features/docs/llm-text/model/llms.ts` (`llmsIndex`, `repositoryLlmsIndex`).
  - `features/docs/shared/model/nav.ts` (`flattenPages`, used only by `llms.ts`).
  These depend only on the hast tree and on `v1.docs.nav`'s output type.
- `@nonete/content` is consumed only through its barrel (`content-package-structure`), which pulls in the git server and the whole page pipeline. `@nonete/api` exports `./*`, so a light module can be imported by path.
- MCP TypeScript SDK v2 (`@modelcontextprotocol/server` 2.3.x, zod 4) provides `createMcpHandler(factory, { legacy })`, a fetch-shaped handler. It serves the 2026-07-28 revision statelessly from a per-request server factory, and 2025-era clients through a stateless fallback (`GET`/`DELETE` → 405). It does no auth and no Origin check of its own, and leaves both to the caller (`originValidationResponse`).

## Goals / Non-Goals

**Goals:**

- One copy of the Markdown and `llms.txt` code, used by the frontend routes, "Copiar en Markdown" and the MCP.
- Tools that call procedures, never handlers or the content reader directly, so access rules live in one place.
- Tools testable in `packages/api` without HTTP or the MCP transport.

**Non-Goals:**

- OAuth / MCP authorization discovery (`/.well-known/oauth-protected-resource`). The key goes in a header the client config sets.
- A stdio entry point, or a published npm package for the server.
- Caching tool results, or any MCP resource, prompt or subscription.

## Decisions

### 1. Shared Markdown code lives in `packages/api/src/v1/docs/`

Move it as three feature-specific modules beside the docs feature's four files. `layering.md` allows these, like `content/reader.ts`:

- `markdown.ts`: `pageMarkdown` and `MarkdownSource`. It moves with its `hast-util-to-mdast` and `mdast-util-to-markdown` dependencies.
- `full-links.ts`: `withOrigin`, with no imports, so the browser copy script can keep importing it alone.
- `llm-text.ts`: `flattenPages`, `DocsPageEntry`, `llmsIndex` and `repositoryLlmsIndex`, typed from `docsOutput.nav` with `z.infer` instead of the frontend's `AppRouterClient` inference.

The frontend imports them by path (`@nonete/api/v1/docs/markdown`, …). Its `features/docs/page` and `features/docs/llm-text` barrels re-export them, so pages and components don't change. The frontend's `textResponse`/`textNotFound` stay in the frontend, since they are HTTP-only. Tests move to `packages/api/tests/v1/docs/{markdown,full-links,llm-text}.test.ts`.

*Alternatives:*
- `packages/content/src/pages/`: the hast side fits there, but its only door is the barrel, so the frontend SSR would load the git server and the parser. The `llms.txt` builder also needs the API's nav shape, which content doesn't own.
- Keeping the code in the frontend and having the backend fetch `llm.txt` over HTTP: the backend would depend on the frontend, a loop through the gateway.

### 2. MCP code in `packages/api/src/v1/mcp/`, transport in `apps/backend`

- `packages/api/src/v1/mcp/tools.ts`: one plain async function per tool, `({ docs, origin, input }) => ToolResult`. `docs` is the `v1.docs` slice of a router client (`nav`, `page`, `search`), typed as `Pick<RouterClient<…>["v1"]["docs"], "nav" | "page" | "search">`. These functions hold all the logic: text formatting, route parsing, mapping `NOT_FOUND` to a tool error. Tests pass a fake `docs`.
- `packages/api/src/v1/mcp/server.ts`: `createDocsMcpServer({ docs, origin })` builds an `McpServer` (name `colofon`, instructions), registers the four tools with zod 4 input/output schemas and `annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false }`, and delegates to `tools.ts`.
- `apps/backend/src/routers/mcp.ts` is the Hono wiring. It handles `all("/mcp")` like this:
  1. If the `Origin` header is present and is not the public origin, answer 403. The SDK's `originValidationResponse` does this, with `env.CORS_ORIGIN` as the public origin.
  2. If there is no `user`, answer 401 `text/plain` in Spanish.
  3. Otherwise build the oRPC context with `createContext` and a client with `createRouterClient(appRouter, { context })`, and pass the request to the module-level `createMcpHandler`.

The folder is versioned because the tools are bound to `v1` procedures. It is not an oRPC feature: no `input/output/handler/router` split, and no key in `appRouter`.

*Alternative:* tools calling `createDocsHandler` directly would skip `protectedProcedure` and any future permission middleware, which is exactly what the tools must not do.

### 3. Per-request scope through `authInfo`, one module-level handler

`createMcpHandler` takes a factory `(ctx: McpRequestContext) => McpServer`. `ctx` carries only a request and the `authInfo` passed to `fetch`. The `requestInfo` it carries is a **clone** once the SDK has read the body (checked during apply), so a `WeakMap` keyed by the original request does not work. Instead, `serveMcp` stores the caller's scope (client and origin) in a `Map` under a random key and passes that key as `authInfo.token`. The factory takes the scope out of the map. A request the SDK answers without building a server (a `GET`, a bad body) has its entry removed when `serveMcp` returns. The factory always runs before `fetch` resolves, so this never removes a scope that is still needed. This keeps types without casts, and keeps one handler for the process, whose `close()` joins the shutdown sequence. A missing entry (it can't happen through `serveMcp`) makes the factory throw.

*Alternative:* building a new `createMcpHandler` per request. This also works, but each one creates its own event bus and leaves nothing to close at shutdown.

### 4. Public origin from `CORS_ORIGIN`

Tool texts use `new URL(env.CORS_ORIGIN).origin`, the same value the frontend's `publicOrigin` prefers. This makes `index` and `read` byte-identical to the routes behind the gateway. If the value is missing or invalid, use the request URL's origin, like the frontend does.

### 5. Text first, structured content where it helps

Agents read text, so every tool returns one Markdown text block. `repositories` and `search` also declare an `outputSchema` and return `structuredContent`, for clients that consume it. `index` and `read` are documents, and text alone is the right shape. Tool descriptions and error texts are English (the `.describe()` rule), and the documentation text keeps its own language.

### 6. Route parsing for `read`

`read` accepts any form an agent will have seen. It strips, in this order: the public origin (and any `http(s)://host` prefix), the query and fragment, a trailing `/llm.txt` and trailing slashes. Then it splits the result into the first segment (slug) and the rest (page path), and calls `docs.page({ repository, path })`. Input validation errors from `page` (bad slug or path shape) also become a tool error ("not a documentation route"), not a protocol error.

### 7. Shutdown

The handler's `close()` aborts in-flight modern exchanges. Register it in `packages/api/src/v1/lifecycle.ts` next to the cron stream closers, so `closeStreams()` ends it before the HTTP drain. The handler therefore lives in `packages/api/src/v1/mcp/handler.ts` (module-level, on `globalThis` for `bun --hot` like the event publishers), and the backend router imports it.

## Risks / Trade-offs

- [SDK v2 is recent, and its API may shift in minor versions] → Pin an exact version in the catalog. All SDK use stays in `server.ts`, `handler.ts` and the backend router.
- [Some MCP clients answer a 401 by trying OAuth discovery and show a confusing error] → The 401 body explains `x-api-key`. The stack skill reference documents the client config (`headers: { "x-api-key": … }`). Adding protected-resource metadata is possible later.
- [Moving runtime code into `@nonete/api` puts `hast-util-to-mdast` in the frontend's SSR graph through a package path] → This is the same code the frontend ran before. Only `full-links.ts` reaches the browser bundle, and it imports nothing.
- [The scope key travels in `authInfo`, which the SDK documents as pass-through] → `tests/v1/mcp/handler.test.ts` drives the real handler with the SDK's client, so an SDK change that stops passing it fails the suite.
- [Without per-repository permissions, any valid key reads everything] → This is the same exposure the reader and `llms.txt` have today. It is fixed in the procedures by `TODO.md` 2, and the MCP inherits the fix.

## Migration Plan

No data changes. Deploy order doesn't matter, because the gateway route and the backend route ship together. To roll back, revert the change: the frontend's Markdown output is unchanged, so nothing depends on the MCP.
