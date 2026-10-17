## Context

The MCP tools never touch the database: `apps/backend/src/routers/mcp.ts` builds a router client as the caller (`createRouterClient(appRouter, { context })`) and hands `packages/api/src/v1/mcp/server.ts` the slices of it each tool needs, as `Pick` types (`DocsClient`, `SkillsClient`, `ContentClient`). Today the content client is passed only to admins (`contentFor`) and holds `syncRepository`, which is already open to every user for the repositories they read.

What the new tools need already exists as procedures:

- `v1.content.listMyRepositories` and `v1.content.createMyRepository` (`protectedProcedure`), which validate the slug, the URL (`userUrl`: public https, trusted hosts) and the `credentialId` (owned by the caller and bound to the URL's host).
- `v1.gitCredential.list`, which returns host, username, `inUse` and `unreadable` without tokens, but is a `sessionProcedure`, so a request with an API key gets `FORBIDDEN`.

`v1.secret` already follows the split this change applies to credentials: `list` is a `protectedProcedure` (the MCP's `secrets` tool reads it) and every write is a `sessionProcedure`.

## Goals / Non-Goals

**Goals:**

- The tools run through the existing procedures as the caller, so every rule stays in one place.
- No token ever travels through the MCP, in either direction.

**Non-Goals:**

- Editing or deleting a repository from the MCP, listing a remote's branches or content folders, or saving a credential: they stay on the profile page.
- Hosted repositories: the owner procedures don't offer them.

## Decisions

**The tools call procedures, never handlers.** `ContentClient` grows to `Pick<…, "syncRepository" | "listMyRepositories" | "createMyRepository">` and a new `CredentialClient` picks `v1.gitCredential.list`. The tools stay in `content-tools.ts` beside `sync`. Alternative: calling `contentHandler` directly from the tools, which would skip the access middleware and break the rule stated at the top of `tools.ts`.

**A credential is named by its username, resolved on the URL's host.** `add_repository` takes `credential: "<username>"`. The tool lists the caller's credentials, picks the one whose `host` equals `hostOf(url)` and whose `username` matches, and passes its id as `credentialId`. Host and username are unique per user, so the match is unambiguous, and an agent reads them in `my_repositories` without copying UUIDs. If nothing matches, the tool answers with an error and doesn't call the procedure. Alternatives: taking `credentialId`, which is opaque and easy for an agent to mistype, or a new procedure input keyed by username, which would change the API for one consumer.

**Credentials list opens to API keys; save and delete don't.** `gitCredential.list` moves from `sessionProcedure` to `protectedProcedure`, as `secret.list` did. What a key can read is hosts and usernames. What it can do with them is clone through `createMyRepository`, where the token only ever goes to the credential's own host. Alternative: a separate MCP-only listing outside oRPC, which would duplicate the procedure.

**The tool refuses URLs with credentials itself.** `userUrl` still accepts `https://user:token@host/…`, because pasted URLs in the form rely on it. `add_repository` checks the parsed URL's `username` and `password` before calling the procedure and answers with an error that never quotes the URL. The token is already in the agent's conversation by then, but the platform doesn't store it or echo it back, and the error tells the agent to use a saved credential next time.

**Every user gets the same server.** `contentFor` and the admin-only branch in `server.ts` go away. `my_repositories`, `add_repository` and `sync` join `MCP_TOOL_NAMES`, so `MCP_ADMIN_TOOL_NAMES` and the admin paragraph of `/llms.txt` (`llm-text.ts`) go too. The `SYNC_INSTRUCTIONS` line becomes part of the base instructions.

**Errors map from `ORPCError` codes to tool error results**, like `syncTool` does today. `CONFLICT` means the slug is taken. `BAD_REQUEST` from input validation carries the zod issues: the tool lists their messages (the Spanish ones the profile form shows) prefixed with the field path. `BAD_REQUEST` from the credential's host check can't happen after the tool's own match, but it maps to the same output. `SERVICE_UNAVAILABLE`, or `enabled: false` in the credentials list, means credentials are off. Any other error is rethrown, as in `syncTool`.

**Annotations are per tool.** `add_repository` gets its own object (`readOnlyHint: false`, `destructiveHint: false`, `idempotentHint: false`, `openWorldHint: true`). `my_repositories` uses the shared read-only `annotations`.

## Risks / Trade-offs

- [An API key can now create repositories and clone with saved credentials] → The remote rules still apply (public https or a trusted host), the token only goes to its own host, and the user can revoke the key. Listing is read-only and shows no tokens.
- [Any user's agent can sync platform repositories on demand] → The procedure already allows this from the reader. A sync is one fetch per call, the same load as the web button.
- [An agent may keep calling `add_repository` with slugs that are taken] → Each call is one insert attempt that fails with `CONFLICT`. The error tells the agent to choose another slug, and `my_repositories` shows what the user already has.

## Migration Plan

Archive `repository-access-token` first, so `openspec/specs/git-credentials/spec.md` exists for this change's delta. When this change is synced, update the `documentation-mcp` spec's Purpose by hand: it still says the tools are read-only and that `sync` is for admins. Nothing to deploy beyond the backend: no database or environment change, and clients pick up the new tools when they list them again.
