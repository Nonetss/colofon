## 0. Prerequisite

- [x] 0.1 Archive the change `repository-access-token` (`/opsx:archive`) so `openspec/specs/git-credentials/spec.md` exists; verify with `openspec validate mcp-own-repositories`

## 1. Credentials list readable with an API key

- [x] 1.1 In `packages/api/src/v1/git-credential/router.ts`, build `list` with `protectedProcedure` instead of `sessionProcedure` and drop "Only from a browser session" from its description; `save` and `delete` stay `sessionProcedure`
- [x] 1.2 In `packages/api/tests/v1/git-credential/handler.test.ts`, add router-level tests with `apiKeyContext()`: `list` answers the caller's hosts and usernames without tokens, and `save` and `delete` answer `FORBIDDEN` and write nothing; verify with `bun test` in `packages/api`

## 2. Content tools

- [x] 2.1 In `packages/api/src/v1/mcp/content-tools.ts`, widen `ContentClient` to `syncRepository | listMyRepositories | createMyRepository`, add `CredentialClient` (`v1.gitCredential.list`), and add the input/output schemas of `my_repositories` and `add_repository`; verify with `check-types`
- [x] 2.2 Implement `myRepositoriesTool`: text and structured content with each repository (slug, name, masked URL, ref, folder, credential host/username resolved from the list, last sync, commit, error, reader address), the credentials (host, username, unreadable) or the "credentials off" line, and the profile page address; the "no repositories" text points to `add_repository`
- [x] 2.3 Implement `addRepositoryTool`: refuse a URL with a username or password without quoting it; resolve `credential` by `hostOf(url)` and username (error pointing to `my_repositories` when nothing matches, or saying credentials are off); call `createMyRepository`; map `CONFLICT`, `BAD_REQUEST` (zod issue messages with their field paths) and `SERVICE_UNAVAILABLE` to tool error results and rethrow anything else; the success text says the sync started and that `sync` waits for it
- [x] 2.4 In `packages/api/tests/v1/mcp/content-tools.test.ts`, add tests with fake clients for `myRepositoriesTool` (lists repositories and credentials, never a token; credentials off; no repositories; a failed sync shows its error) and `addRepositoryTool` (public URL; credential resolved to its id on the URL's host; no match for that host; token in the URL refused without calling the client or echoing the token; `CONFLICT`; validation messages; other errors rethrown); verify with `bun test` in `packages/api`

## 3. Serve the tools to every user

- [x] 3.1 In `packages/api/src/v1/mcp/server.ts`, make `McpScope.content` non-null and add the credentials client; register `my_repositories` (shared read-only annotations), `add_repository` (not read-only, not destructive, not idempotent, open-world) and `sync` for every caller; fold the sync and repository lines into the base instructions; verify with `check-types`
- [x] 3.2 In `packages/api/src/v1/mcp/setup.ts`, add `my_repositories`, `add_repository` and `sync` to `MCP_TOOL_NAMES` and remove `MCP_ADMIN_TOOL_NAMES`; in `packages/api/src/v1/docs/llm-text.ts`, drop the admin-tools paragraph and describe the new tools; verify with `check-types`
- [x] 3.3 In `apps/backend/src/routers/mcp.ts`, remove `contentFor` and pass `client.v1.content` and `client.v1.gitCredential` to every user's server; verify with `check-types`
- [x] 3.4 Update `packages/api/tests/v1/mcp/handler.test.ts` (an admin and a non-admin list the same tools; the list with secrets on and off; the annotations of `add_repository`, `sync` and the read-only tools), `packages/api/tests/v1/mcp/setup.test.ts` and `packages/api/tests/v1/docs/llm-text.test.ts` (no admin paragraph, the new tools named); verify with `bun test` in `packages/api`

## 4. Validation

- [x] 4.1 From the repo root, run `bun run check-types`, Biome (`bunx biome check .`, without writing) and `bun run test`, and fix anything they report
