# Documentation MCP (`/mcp`)

An MCP server for agents to read the documentation, on the backend at `/mcp`. It runs on the official TypeScript SDK v2 (`@modelcontextprotocol/server`, pinned exactly in the root catalog), over Streamable HTTP and statelessly: one fresh server per request, no session ids, and `GET`/`DELETE` answer 405. It serves the current protocol revision plus the 2025-era fallback. The behavior contract is the `documentation-mcp` OpenSpec capability.

## Where it lives

| File | Holds |
| --- | --- |
| `packages/api/src/v1/mcp/tools.ts` | One plain async function per tool (`repositoriesTool`, `indexTool`, `searchTool`, `readTool`), `parseRoute`, the structured output schemas, and the `DocsClient`/`ToolScope` types. All the logic is here. |
| `packages/api/src/v1/mcp/server.ts` | `createDocsMcpServer(scope)`: the `McpServer` (name `colofon`, instructions) and the tool registrations (input and output schemas, annotations). No logic. |
| `packages/api/src/v1/mcp/handler.ts` | The single process-wide `createMcpHandler` (on `globalThis` for `bun --hot`), `serveMcp(request, scope)` and `closeMcp()`. `closeMcp()` is registered in `src/v1/lifecycle.ts`. |
| `apps/backend/src/routers/mcp.ts` | The Hono route. In order: an `Origin` that is not the public origin → 403; no user → 401 `text/plain` (Spanish); otherwise `createRouterClient(appRouter, { context })` → `serveMcp`. |
| `packages/api/src/v1/docs/{markdown,full-links,llm-text}.ts` | The page→Markdown writer, `withOrigin`, and the `llms.txt` builders, shared with the frontend's `llm.txt`/`llms.txt` routes and "Copiar en Markdown". |

`src/v1/mcp/` is not an oRPC feature: no `input/output/handler/router` split, and no key in `appRouter`. The SDK builds each server in a factory that only gets the request (a clone, once the body is read) and the `authInfo` passed to `fetch`. So `serveMcp` keeps the caller's scope in a map under a random key sent as `authInfo.token`, and the factory takes it out. That token is not a credential.

## Rules

- **Tools read through procedures, never handlers.** A tool calls `scope.docs.<procedure>()`, the `v1.docs` slice of a router client built with the caller's context. It never calls `createDocsHandler`, the content reader or the database. This is what makes a tool show exactly what the reader shows that user, and what makes access rules added to the procedures (per-repository permissions) apply to the MCP with no change here.
- **Text first.** Every tool returns one Markdown text block. A tool whose result is a list also declares an `outputSchema` (in `tools.ts`) and returns `structuredContent`. Every link to a reader route is a full address on the public origin (`env.CORS_ORIGIN`).
- **Not found is a tool error, not a failure.** An unknown repository or page returns `isError: true` with a text that says what to do next. `NOT_FOUND` and `BAD_REQUEST` from the reader are mapped this way. A `repository` argument is checked against `nav` before searching, because `v1.docs.search` quietly searches everything for a slug that names none. Any other error is rethrown, and the SDK turns it into an error result. Invalid arguments never reach the tool: the SDK answers them as a tool error naming the argument.
- **Same text as the routes.** `index` returns `llmsIndex`/`repositoryLlmsIndex`, and `read` returns `withOrigin(pageMarkdown(...))` under one `Location:` line (repository, breadcrumbs, title and address), so the tools match `/llms.txt` and `<page>/llm.txt` byte for byte apart from that line. Change the text in `src/v1/docs/`, never in a tool.
- Every tool is read-only today: `annotations` `readOnlyHint`/`idempotentHint` true, `openWorldHint` false. A tool that writes would get its own annotations and, per `VISION.md`, a separate name the client can gate.
- Descriptions, instructions and error texts are English. The documentation keeps its own language.

## Adding a tool

1. Add the function in `tools.ts`, as `({ docs, origin, input }) => Promise<CallToolResult>`. If it needs a procedure outside `nav`/`page`/`search`, widen `DocsClient`'s `Pick` (or add a sibling client to `ToolScope`) and pass it from `apps/backend/src/routers/mcp.ts`.
2. Register it in `server.ts`, with a zod `inputSchema` (reuse the procedure's own input schema when the rules are the same, as `search` reuses `docsInput.search`), an `outputSchema` if it returns a list, `annotations`, and a description that tells the agent when to use it.
3. Add its tests to `packages/api/tests/v1/mcp/tools.test.ts`, with the fake `DocsClient` there: the text, the structured content, each error result, and that it calls the procedure with the right input. If it changes what the server lists, update the tool list in `handler.test.ts`, which drives the real handler with the SDK's client (`@modelcontextprotocol/client`, a devDependency) through a `fetch` that calls `serveMcp`.

## Connecting a client

The URL is `<public origin>/mcp` (in dev, `https://localhost:4321/mcp`), and the credential is an API key from the profile page in the `x-api-key` header:

```sh
claude mcp add --transport http colofon https://docs.example.org/mcp --header "x-api-key: <key>"
```

The dialog that shows a new key on `/me` offers this command, Codex's `config.toml` entry and the `mcpServers` JSON with the key already filled in (`apps/frontend/src/features/api-keys/manage/model/agent-setups.ts`). Keep them in step with the endpoint.

There is no OAuth discovery (`/.well-known/oauth-protected-resource`). A client that tries it after a 401 needs the header set in its config.
