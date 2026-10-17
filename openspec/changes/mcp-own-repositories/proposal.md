## Why

An agent connected to the documentation MCP can read a user's repositories but can't add one, so a user who has just written a content repository with the agent still has to open `/me/repositories` to register it and wait for the periodic sync to see it. The owner procedures, the saved git credentials and the owner-aware sync procedure already exist; the MCP only has to expose them.

## What Changes

- New MCP tool `my_repositories` for every user: lists the caller's own repositories with their ref, folder, credential and the outcome of their last sync, and the git credentials the caller has saved (host and username, never a token).
- New MCP tool `add_repository` for every user: adds an external repository private to the caller through the same owner procedure as the profile page (same slug, URL and remote rules), optionally cloning with one of the caller's saved git credentials named by its username. A token can't be passed through the tool, so it never reaches the agent's conversation.
- The `sync` tool is served to every user, not only admins: it syncs any repository the caller can read, as the sync procedure already allows.
- The git credentials list can be read with an API key too, so the MCP can resolve a credential; saving and deleting a credential stay limited to a browser session.
- The server's instructions, `/llms.txt` and the tool annotations describe the new tools.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `documentation-mcp`: the endpoint's tool list and instructions, the read-only tools rule (a new writing tool), the sync tool served to every user, and two new tools (`my_repositories`, `add_repository`).
- `git-credentials`: the list procedure is also open to API keys. This capability is introduced by the change `repository-access-token`, which must be archived before this one.

## Impact

- `packages/api`: `src/v1/mcp` (new content tools, their registration and annotations, the tool name lists in `setup.ts`), `src/v1/docs/llm-text.ts` (the tools paragraph of `/llms.txt`), `src/v1/git-credential/router.ts` (the list's procedure builder) and their tests.
- `apps/backend`: `src/routers/mcp.ts` passes the content and credential clients to every user's server.
- No database, migration, environment or frontend change.
