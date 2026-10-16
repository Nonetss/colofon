# Documentation MCP (`/mcp`)

An MCP server for agents to read the documentation, on the backend at `/mcp`. It runs on the official TypeScript SDK v2 (`@modelcontextprotocol/server`, pinned exactly in the root catalog), over Streamable HTTP and statelessly: one fresh server per request, no session ids, and `GET`/`DELETE` answer 405. It serves the current protocol revision plus the 2025-era fallback. The behavior contract is the `documentation-mcp` OpenSpec capability.

## Where it lives

| File | Holds |
| --- | --- |
| `packages/api/src/v1/mcp/tools.ts` | One plain async function per tool (`repositoriesTool`, `indexTool`, `searchTool`, `readTool`, `entityTool`, `skillsTool`, `skillTool`), `parseRoute` (repository, path and `#section`), the structured output schemas, and the `DocsClient`/`SkillsClient`/`ToolScope` types. All the logic is here. |
| `packages/api/src/v1/mcp/server.ts` | `createDocsMcpServer(scope)`: the `McpServer` (name `colofon`, instructions) and the tool registrations (input and output schemas, annotations). No logic. |
| `packages/api/src/v1/mcp/section.ts` | `sectionTree(tree, id)`: one section of a page's tree (a top-level `h2`/`h3` and what follows it up to the next heading of its level or higher), for `read` with a `#section` route. |
| `packages/api/src/v1/mcp/setup.ts` | How a client connects: `mcpUrl`, `claudeCodeCommand`, `codexConfig`, `mcpServersJson`, and `MCP_TOOL_NAMES`. No imports, so the `/me` key dialog (`apps/frontend/src/features/api-keys/manage/model/agent-setups.ts`) loads it in the browser; `/llms.txt`'s guide uses the same command and tool names. `handler.test.ts` checks that `MCP_TOOL_NAMES` are the tools the server lists. |
| `packages/api/src/v1/mcp/handler.ts` | The single process-wide `createMcpHandler` (on `globalThis` for `bun --hot`), `serveMcp(request, scope)` and `closeMcp()`. `closeMcp()` is registered in `src/v1/lifecycle.ts`. |
| `apps/backend/src/routers/mcp.ts` | The Hono route. In order: an `Origin` that is not the public origin → 403; no user → 401 `text/plain` (Spanish); otherwise `createRouterClient(appRouter, { context })` → `serveMcp`. |
| `packages/api/src/v1/docs/{markdown,full-links,llm-text}.ts` | The page→Markdown writer, `withOrigin`, and the `llms.txt` builders, shared with the frontend's `llm.txt`/`llms.txt` routes and "Copiar en Markdown". |

`src/v1/mcp/` is not an oRPC feature: no `input/output/handler/router` split, and no key in `appRouter`. The SDK builds each server in a factory that only gets the request (a clone, once the body is read) and the `authInfo` passed to `fetch`. So `serveMcp` keeps the caller's scope in a map under a random key sent as `authInfo.token`, and the factory takes it out. That token is not a credential.

## Rules

- **Tools read through procedures, never handlers.** A tool calls `scope.docs.<procedure>()` or `scope.skills.<procedure>()`, the `v1.docs` and `v1.skills` slices of a router client built with the caller's context. It never calls `createDocsHandler`, the content reader or the database. This is what makes a tool show exactly what the reader shows that user, and what makes access rules added to the procedures (per-repository permissions) apply to the MCP with no change here.
- **Text first.** Every tool returns one Markdown text block. A tool whose result is a list also declares an `outputSchema` (in `tools.ts`) and returns `structuredContent`. Every link to a reader route is a full address on the public origin (`env.CORS_ORIGIN`).
- **Not found is a tool error, not a failure.** An unknown repository or page returns `isError: true` with a text that says what to do next. `NOT_FOUND` and `BAD_REQUEST` from the reader are mapped this way. A `repository` argument is checked against `nav` before searching, because `v1.docs.search` quietly searches everything for a slug that names none. Any other error is rethrown, and the SDK turns it into an error result. Invalid arguments never reach the tool: the SDK answers them as a tool error naming the argument.
- **Same text as the routes.** `index` returns `llmsIndex`/`repositoryLlmsIndex` (with the caller's skills from `v1.skills.list`), `skill` returns `v1.skills.get`'s text, the same as `/.well-known/agent-skills/<name>/SKILL.md`, and `read` returns `withOrigin(pageMarkdown(...))` under one `Location:` line (repository, breadcrumbs, title and address), so the tools match `/llms.txt` and `<page>/llm.txt` byte for byte apart from that line. A route with a `#section` that names one of the page's headings returns only that section (`sectionTree`, written with `bodyMarkdown`), with the heading added to the `Location:` line. `entity` reads the entity's generated catalog page (`entityPath` from `@nonete/content`) with the same formatting as `read`, so the two can't drift apart. Change the text in `src/v1/docs/`, never in a tool.
- Every tool is read-only today: `annotations` `readOnlyHint`/`idempotentHint` true, `openWorldHint` false. A tool that writes would get its own annotations and, per `VISION.md`, a separate name the client can gate.
- Descriptions, instructions and error texts are English. The documentation keeps its own language.

## Adding a tool

1. Add the function in `tools.ts`, as `({ docs, skills, origin, input }) => Promise<CallToolResult>`. Add its name to `MCP_TOOL_NAMES` in `setup.ts`, so `/llms.txt` lists it. If it needs a procedure outside `nav`/`page`/`search`, widen `DocsClient`'s `Pick` (or add a sibling client to `ToolScope`) and pass it from `apps/backend/src/routers/mcp.ts`.
2. Register it in `server.ts`, with a zod `inputSchema` (reuse the procedure's own input schema when the rules are the same, as `search` reuses `docsInput.search`), an `outputSchema` if it returns a list, `annotations`, and a description that tells the agent when to use it.
3. Add its tests to `packages/api/tests/v1/mcp/tools.test.ts`, with the fake `DocsClient` there: the text, the structured content, each error result, and that it calls the procedure with the right input. If it changes what the server lists, update the tool list in `handler.test.ts`, which drives the real handler with the SDK's client (`@modelcontextprotocol/client`, a devDependency) through a `fetch` that calls `serveMcp`.

## Connecting a client

The URL is `<public origin>/mcp` (in dev, `https://localhost:4321/mcp`), and the credential is an API key from the profile page in the `x-api-key` header:

```sh
claude mcp add --transport http colofon https://docs.example.org/mcp --header "x-api-key: <key>"
```

The dialog that shows a new key on `/me` offers this command, Codex's `config.toml` entry and the `mcpServers` JSON with the key already filled in (`apps/frontend/src/features/api-keys/manage/model/agent-setups.ts`), and `/llms.txt` shows the command with a placeholder. Both build them with `src/v1/mcp/setup.ts`, so a change to the endpoint goes there.

There is no OAuth discovery (`/.well-known/oauth-protected-resource`). A client that tries it after a 401 needs the header set in its config.
