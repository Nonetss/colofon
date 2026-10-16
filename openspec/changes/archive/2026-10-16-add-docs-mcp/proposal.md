## Why

Agents can already read the documentation through `llms.txt` and the `llm.txt` routes, but only by fetching URLs and following links. An MCP endpoint gives any agent (Claude Code, Codex, Cursor…) typed tools to list the repositories, search, and read pages with the API key it already uses, which is the "Knowledge MCP" milestone of `VISION.md`. It goes first with the read-only tools that the existing procedures already back. Per-repository permissions come later and will apply to it without changes, because every tool goes through those procedures with the key's session.

## What Changes

- New MCP endpoint `/mcp` on the backend, served over Streamable HTTP and stateless, with the official MCP TypeScript SDK v2 (`@modelcontextprotocol/server`). It is authenticated like the rest of the API: an API key in `x-api-key`, or a session cookie. A request without a credential gets 401 and never reaches the MCP server.
- Four read-only tools, named in English:
  - `repositories`: the content repositories the caller can read, with slug, name, description and whether they have content.
  - `index`: the `llms.txt` text, either the global one or one repository's.
  - `search`: the documentation search (`v1.docs.search`), returning ranked results with route, title, trail and excerpt. An unknown repository is an error, not a search of every repository.
  - `read`: one page as Markdown, the same text as its `llm.txt` route under one line saying where the page is. It takes the route as `search` returns it or as the index links it.
- Every tool calls the existing `v1.docs` procedures as the caller (`nav`, `page`, `search`). They are not reimplemented, and a tool sees exactly what the reader shows that user.
- The gateway forwards `/mcp` to the backend.
- Shared code: the page→Markdown writer (`pageMarkdown`, `withOrigin`) and the `llms.txt` builders (`llmsIndex`, `repositoryLlmsIndex`, `flattenPages`) move from `apps/frontend` to `packages/api/src/v1/docs/`. The frontend's `llm.txt`/`llms.txt` routes and "Copiar en Markdown" then use the same code as the MCP. Their output does not change.
- Out of scope: per-repository permissions and restricted keys (`TODO.md` 1–3), the `entity(type, id)` tool, and the skills tools (`TODO.md` 5).

## Capabilities

### New Capabilities

- `documentation-mcp`: the `/mcp` endpoint (transport, authentication, server identity) and its read-only tools `repositories`, `index`, `search` and `read`: inputs, outputs, errors, and how they reuse the reader's procedures and the `llms.txt`/`llm.txt` text.

### Modified Capabilities

- `http-gateway`: the gateway also forwards `/mcp` to the backend.
- `http-server`: the backend also mounts the MCP router at `/mcp`.

## Impact

- **New dependencies**: `@modelcontextprotocol/server` (v2, zod 4 like the repo) in `packages/api` and `apps/backend`. `hast-util-to-mdast` and `mdast-util-to-markdown` move from the frontend to `packages/api`.
- **packages/api**: `src/v1/docs/markdown.ts`, `full-links.ts` and `llm-text.ts` (moved from the frontend), and a new `src/v1/mcp/` with the server factory and tools. This is not an oRPC feature and is not in `appRouter`. Tests go under `tests/v1/docs/` and `tests/v1/mcp/`.
- **apps/backend**: new `src/routers/mcp.ts`, mounted in `src/index.ts`. The session middleware already turns `x-api-key` into a session.
- **apps/frontend**: `features/docs/llm-text` and `features/docs/page` import the moved helpers from `@nonete/api`. Their unit tests move with the code.
- **apps/gateway**: `routes.caddy` adds `/mcp` to the backend matcher. Since repository slugs are the first segment of reader routes, `mcp` joins the reserved slugs in `packages/content/src/contract/reserved-slugs.ts`. This is already required by `content-repository-management`, whose rule covers every path the gateway sends to the backend.
- **Stack skill**: a reference for the MCP (where tools live and how to add one) and a routing row in `SKILL.md`. `references/api/layering.md` notes the `mcp/` folder and the docs modules.
- No database or migration changes.
