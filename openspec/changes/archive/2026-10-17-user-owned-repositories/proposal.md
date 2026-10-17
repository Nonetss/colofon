## Why

Today the only content repositories are the ones an administrator registers in `/admin/content`, and every signed-in user reads all of them. A user who keeps their own notes or documentation in a git repository has no way to read it in the platform, nor to hand it to their AI through the MCP. Letting each user add their own git repositories, visible only to them, turns the reader into a personal tool as well as the team's.

## What Changes

- A content repository can belong to a user. Repositories without an owner (the ones admins create today) stay visible to every signed-in user; a user's repository is visible only to its owner, in the reader, the search, the MCP, the skills and the `llms.txt` pages. Not even admins read it.
- A signed-in user can add, edit, delete and sync their own external repositories (an `https://` URL, an optional token inside it, a branch), from a new section of the profile, `/me/repositories`. Hosted repositories (`/git/<slug>.git`) remain admin-only.
- Each user is limited to a fixed number of repositories, and the URLs users type are held to a stricter rule than an admin's (HTTPS only, no loopback, private or link-local hosts), since the backend clones them from inside the platform's network.
- The slug stays globally unique and shares the reserved names, since it is still the reader's `/<slug>/…` route.
- The editor schema endpoints (`/api/v1/content/schemas/<slug>`) answer `NOT_FOUND` for a user's repository: they are public and cannot tell whose repository it is.
- The admin screen keeps listing only the platform's repositories.
- **BREAKING** (behavior): "every stored repository" in the reader's procedures becomes "every repository the caller can read".

## Capabilities

### New Capabilities

- `user-content-repositories`: ownership and visibility of a user's repositories, the owner-only management procedures, the per-user limit, the URL restrictions and the `/me/repositories` screen.

### Modified Capabilities

- `content-repository-management`: the admin procedures act only on the platform's repositories, and the sync procedure is open to the owner of a user's repository rather than to every signed-in user.
- `documentation-reader`: the reader procedures serve the repositories the caller can read, not every stored one.

## Impact

- `packages/db`: a nullable `owner_id` column (reference to the user) on `content_repository`. The migration is the user's to generate; this change only proposes the schema edit.
- `packages/api` (`v1/content`, `v1/docs`, `v1/skills`, `v1/mcp`): the repository store gains a viewer, owner-only procedures are added, the schema endpoints skip user-owned repositories, and the periodic sync keeps covering all repositories.
- `packages/content`: a URL check for user-typed remotes.
- `apps/frontend`: `/me/repositories` page and slice, `app-surfaces.ts` child of `profile`; depends on the in-flight `profile-section-sidebar` change.
- `.agents/skills/stack/references/` updated where they describe repository access.
