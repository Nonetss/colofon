## 1. Dependencies

- [x] 1.1 Add `@modelcontextprotocol/server` at an exact 2.3.x version to the root catalog, and as a dependency of `packages/api` and `apps/backend`. Move `hast-util-to-mdast` and `mdast-util-to-markdown` (and `mdast-util-gfm`, `@types/hast` if the frontend no longer needs them) from `apps/frontend` to `packages/api`. Verify that `bun install` succeeds and `bun pm ls` shows the packages in their new workspaces.

## 2. Move the Markdown and llms.txt code to packages/api

- [x] 2.1 Move `apps/frontend/src/features/docs/page/model/markdown.ts` to `packages/api/src/v1/docs/markdown.ts`, and `full-links.ts` to `packages/api/src/v1/docs/full-links.ts`, unchanged except for imports. Verify `check-types` in `packages/api`.
- [x] 2.2 Create `packages/api/src/v1/docs/llm-text.ts` with `flattenPages`, `DocsPageEntry`, `llmsIndex` and `repositoryLlmsIndex`, moved from the frontend's `shared/model/nav.ts` and `llm-text/model/llms.ts` and typed from `z.infer<typeof docsOutput.nav>`. Remove `flattenPages`/`DocsPageEntry` from the frontend if nothing else uses them. Verify `check-types`.
- [x] 2.3 Point the frontend at the moved code. The `features/docs/page` barrel re-exports `pageMarkdown`/`withOrigin` from `@nonete/api/v1/docs/markdown` and `/full-links`, the `features/docs/llm-text` barrel re-exports `llmsIndex`/`repositoryLlmsIndex` from `@nonete/api/v1/docs/llm-text`, and `page-scripts.ts` imports `withOrigin` from `@nonete/api/v1/docs/full-links`. Delete the old frontend model files. Verify `check-types` in `apps/frontend`, and that `bun run build` in `apps/frontend` succeeds without bundling the Markdown writer into client chunks: grep the client output for `hast-util-to-mdast`.
- [x] 2.4 Move `apps/frontend/tests/unit/features/docs/page/markdown.test.ts`, `full-links.test.ts` and `llm-text/llms.test.ts` to `packages/api/tests/v1/docs/markdown.test.ts`, `full-links.test.ts` and `llm-text.test.ts`, adjusting imports and any nav fixtures to the `docsOutput.nav` shape. Verify `bun test` in `packages/api` passes them and `bun test` in `apps/frontend` still passes.

## 3. MCP tools (packages/api)

- [x] 3.1 Create `packages/api/src/v1/mcp/tools.ts`: the `DocsClient` type (the `nav`, `page` and `search` slice of the `v1.docs` router client), the shared tool result type (text plus optional structured content plus `isError`), and a route parser (`parseRoute(route, origin) → { repository, path } | null`) following design Decision 6. Verify with the tests in 3.4.
- [x] 3.2 In `tools.ts`, implement `repositoriesTool`, `indexTool`, `searchTool` and `readTool` as `({ docs, origin, input }) => Promise<ToolResult>`, per the `documentation-mcp` spec. `index` uses `llmsIndex`/`repositoryLlmsIndex`, `read` uses `pageMarkdown` + `withOrigin`, `NOT_FOUND` and input validation errors from `docs.page` become `isError` results, and links are full addresses on `origin`. Verify with the tests in 3.4.
- [x] 3.3 Create `packages/api/src/v1/mcp/server.ts` with `createDocsMcpServer({ docs, origin })`, which builds an `McpServer` (name `colofon`, instructions per spec) and registers the four tools with zod input schemas (reusing `docsInput.search`'s query/limit rules), output schemas for `repositories` and `search`, and read-only/idempotent annotations. Then create `packages/api/src/v1/mcp/handler.ts` with the module-level `createMcpHandler` (kept on `globalThis` for `bun --hot`), the scope registry from design Decision 3 (a `Map` keyed by a random token passed as `authInfo`), a `serveMcp(request, { docs, origin })` function, and `closeMcp()`. Verify with `check-types`.
- [x] 3.4 Write `packages/api/tests/v1/mcp/tools.test.ts` with a fake `DocsClient` (no database needed), following `references/writing-unit-tests.md`. Assert that:
  - `parseRoute` accepts `/casa`, `/casa/red/dns`, a trailing slash, `/llm.txt`, `?q`, `#anchor` and a full origin, and rejects `/` and non-routes.
  - `repositories` lists repositories with and without content, and their `llms.txt` addresses.
  - `index` equals `llmsIndex`/`repositoryLlmsIndex` output and returns an error for unknown or unavailable slugs.
  - `search` text and structured content handle results with and without an excerpt, the repository shown only when several were searched, and the no-results text.
  - `read` returns the same text as `withOrigin(pageMarkdown(...))`, and a `NOT_FOUND` from `docs.page` becomes `isError`.
  Verify `bun test` in `packages/api`.
- [x] 3.5 Write `packages/api/tests/v1/mcp/handler.test.ts`, which connects the SDK's client (`@modelcontextprotocol/client`, a devDependency) to `serveMcp` through a `fetch` that calls it directly, with the fake client. Also assert that a `GET` gets 405. Assert that tools/list returns exactly the four tools with read-only annotations, that a call reaches its tool function, and that a call missing `query` returns an `isError` result naming the argument. Verify `bun test`.
- [x] 3.6 Register `closeMcp` in `packages/api/src/v1/lifecycle.ts`. Make `closeStreams` async if needed, and keep the backend's `await step("api streams", closeStreams)` working. Verify `check-types` in `apps/backend`.

## 4. Backend and gateway wiring

- [x] 4.1 Create `apps/backend/src/routers/mcp.ts` with `all("/mcp")`, in this order: Origin check (`originValidationResponse` against the public origin from `env.CORS_ORIGIN`) → 403; no `user` → 401 `text/plain` in Spanish explaining `x-api-key`; otherwise `createContext` + `createRouterClient(appRouter, { context })` → `serveMcp(c.req.raw, { docs: client.v1.docs, origin })`. Mount it in `apps/backend/src/index.ts`, and add `/mcp` to `astro dev`'s proxy in `apps/frontend/astro.config.mjs` next to `/rpc`. Verify `check-types` in `apps/backend`.
- [x] 4.2 Add `/mcp` to the `@backend` matcher in `apps/gateway/routes.caddy`, and `mcp` to `RESERVED_SLUGS` (`packages/content/src/contract/reserved-slugs.ts`), which `tests/contract/reserved-slugs.test.ts` checks against the gateway's paths. Verify by reading the file that `/mcp` (exact path, no wildcard) is in the matcher. No streaming setting is needed: `reverse_proxy` already flushes `text/event-stream` responses immediately, as the `/rpc` event streams rely on.

## 5. Conventions

- [x] 5.1 Add `.agents/skills/stack/references/api/mcp.md`. It covers where the MCP lives (`packages/api/src/v1/mcp/`, `apps/backend/src/routers/mcp.ts`), the rule that tools call procedures through the router client and never handlers, how to add a tool (function in `tools.ts`, registration in `server.ts`, test in `tests/v1/mcp/`), and how a client is configured (URL `<origin>/mcp`, header `x-api-key`). Add a routing row in `stack/SKILL.md`, and in `references/api/layering.md` note `docs/markdown.ts`, `docs/full-links.ts`, `docs/llm-text.ts` and the non-oRPC `mcp/` folder. Verify every path cited exists.
- [x] 5.2 Update `references/workspaces.md` and any stack reference that names the moved frontend files (`features/docs/page/model/markdown.ts`, `full-links.ts`, `llm-text/model/llms.ts`) so they point to the new locations. Verify with `rg "model/markdown|full-links|model/llms" .agents`.

## 6. Validation

- [x] 6.1 Run `bun run check-types`, Biome (`bun run check`, or the repo's Biome script) and `bun run test` from the repo root, and fix anything they report. All three pass.
- [x] 6.2 Ask the user to run a manual smoke check against the running stack: `claude mcp add --transport http colofon https://localhost:4321/mcp --header "x-api-key: <key>"`, then list the tools, and run a search and a read. The agent does not probe the running app itself.
