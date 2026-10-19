## Context

- Better Auth's `organization()` plugin is enabled (`packages/auth/src/index.ts`, teams and dynamic access control on) with the `owner`/`admin`/`member` roles of `@nonete/auth/permissions`. Its tables (`organization`, `member`, `invitation`, `team`, `team_member`, `organization_role`) exist in `packages/db/src/schema/auth/auth.ts`.
- `v1.organization` (`packages/api/src/v1/organization/`) is admin-only and talks to the tables through Drizzle, not through `auth.api`. Its screens were removed in `d11a53f`; their files are still in git history and are a quarry for the new profile screen (role select, member columns, invite dialog).
- A repository's visibility is decided in one place: `RepositoryAudience` (`all` | `platform` | `{ userId }`) in `packages/api/src/v1/content/reader.ts`, turned into a relational `where` by `audienceFilter` (`content/handler.ts`) and checked by `isVisibleTo`. `v1.docs`, `v1.skills`, `llms.txt`, search and the MCP all read through the store with `audienceOfUser(context.user)`.
- `contentRepository.ownerId` marks a user's repository; `null` is a platform repository.

## Goals / Non-Goals

**Goals:**
- Organizations that any user creates and runs from `/me/organizations`, with invitations by email accepted in-app.
- A user's repository readable by the members of the organizations its owner shares it with, through the same audience every read path already uses.
- A visibility rule that stays correct however a membership ends.

**Non-Goals:**
- Teams, custom roles (`organization_role`) and sharing with a team.
- Organization-owned repositories, or members editing a shared repository.
- Sending invitation emails.
- Restoring `/admin/organizations` and `/admin/teams`; admins keep the API.
- Sharing platform repositories (already readable by everyone).

## Decisions

### 1. One join table, `content_repository_share`

`content_repository_share(repository_id uuid → content_repository.id on delete cascade, organization_id text → organization.id on delete cascade, created_at, primary key (repository_id, organization_id))`, in `packages/db/src/schema/content/content.ts` with its relations (`contentRepository.shares`, `organization.repositoryShares`). Cascades cover a deleted repository, owner (through the repository) and organization with no code.

*Alternative:* an `organization_ids text[]` column on `content_repository`. Rejected: no foreign key, so deleted organizations would linger, and no index for "what is shared with org X".

The agent writes the schema only after the user approves this change; the user generates and applies the migration (`AGENTS.md`).

### 2. Visibility requires the owner to still be a member

A shared repository is visible to a caller when some share of it names an organization where **both** the caller and the repository's owner are members. Checking the owner's membership at read time keeps the rule right even when a membership ends through a path that doesn't clean shares (Better Auth's own `/api/auth/organization/*` endpoints, the admin `removeMember`, a manual SQL fix). The profile procedures still delete the owner's shares with an organization when the owner leaves or is removed, so the sharing the owner sees stays honest.

*Alternative:* rely only on cleanup when a membership ends. Rejected: every removal path (ours, the admin's, Better Auth's HTTP endpoints, a deleted user) would need the hook, and missing one leaks a private repository.

### 3. The audience carries the shared repository ids

`RepositoryAudience`'s user case becomes `{ userId, shared: Map<repositoryId, organizationName> }`. `audienceOfUser` becomes async: for a signed-in user it runs one query —

```
share s
  join member me    on me.organization_id = s.organization_id and me.user_id = :user
  join content_repository r on r.id = s.repository_id
  join member owner on owner.organization_id = s.organization_id and owner.user_id = r.owner_id
  join organization o on o.id = s.organization_id
```

— keeping, per repository, the first organization name in alphabetical order (what the reader's selector shows). `audienceFilter` adds `{ id: { in: [...shared.keys()] } }` to its `OR` (only when non-empty), and `isVisibleTo` also accepts `audience.shared.has(repository.id)`. Every caller of `audienceOfUser` awaits it; the reader, docs, skills and MCP code don't change otherwise. The query lives with the content feature (it is about repositories), behind the store so tests can fake it.

*Alternative:* a relational filter on `shares` inside `audienceFilter`. Rejected: the owner-membership condition is a correlated join Drizzle's relational `where` can't express cleanly, and the reader also needs the organization name.

### 4. `v1.myOrganization` as its own feature

The self-service procedures go in `packages/api/src/v1/my-organization/` (`input`/`output`/`handler`/`router`), keyed `myOrganization` in `v1/router.ts`, because they have different access (membership, role rules) from the admin feature and would double `organization/handler.ts`, already flagged as too big. Procedures: `list` (GET), `get` (GET), `create` (POST 201), `update` (PATCH), `delete` (DELETE), `leave` (POST), `invite` (POST 201), `cancelInvitation` (POST), `updateMemberRole` (PATCH), `removeMember` (DELETE), `listInvitations` (GET, addressed to the caller), `acceptInvitation` (POST), `rejectInvitation` (POST).

They use `sessionProcedure`: joining, inviting and sharing widen who reads private documentation, which an agent holding an API key must not do on its own (same reasoning as secrets).

The handler reads the caller's `member` row once (`NOT_FOUND` if missing) and checks the role with small named predicates over the shared role names (`canManageMembers(role)`, `isOwner(role)`), plus a "last owner" count before demoting, removing or leaving. Slug rules and the invitation TTL are reused from `organization/input.ts` and the admin handler (moved to `src/shared` if both need them). It talks to the tables through Drizzle like the admin feature, so both stay alike; membership changes and the share cleanup run in one transaction.

*Alternative:* call `auth.api.*` organization endpoints. Rejected: they need request headers and the active-organization session model, and their errors don't map to our Spanish messages.

### 5. Sharing procedure on `v1.content`

`v1.content.shareMyRepository` (PUT, `sessionProcedure`): `{ slug, organizationIds }` replaces the repository's shares in one transaction. The repository must be the caller's (`NOT_FOUND` otherwise) and every id an organization the caller is a member of (`NOT_FOUND` otherwise, nothing written). The owner procedures' repository output gains `organizations: { id, name, slug }[]`. The form saves the repository first and then calls the share procedure only when the selection changed.

*Alternative:* `organizationIds` in the create/update input. Rejected: create and update run under `protectedProcedure` (the MCP's `add_repository` uses them), and sharing must not be reachable with an API key.

### 6. Reader origin label

The docs navigation output gains `sharedBy` (organization name, or null) per repository, filled from `audience.shared`; the selector shows it as secondary text through a new optional `detail` on `SearchableCombobox`'s options.

### 7. Frontend

- `apps/frontend/src/features/profile/organizations/`, a slice of the profile like its sibling pages (`profile-organizations-page.tsx`/`-content.tsx`: invitations received, the organization table, create/rename dialog; `organization-detail-sheet.tsx`: members and invitations with role select, invite, remove and cancel), adapted from the deleted `features/admin/organizations` files and reusing `DataTableView`, `ConfirmDialog`, `CheckboxRow` and `slugify` (`src/lib`). What each role may do is `model/permissions.ts`. The member rows carry `isCaller` from the API so the sheet marks the viewer's own row and doesn't offer to remove it (leaving is its own action).
- A `/me/organizations` child surface in `app-surfaces.ts` and `pages/me/organizations.astro`.
- `features/profile/repositories`: an organizations field in the repository form (checkbox list fed by `orpc.v1.myOrganization.list`, link to `/me/organizations` when empty) and the organizations on each card. The share mutation invalidates `content.listMyRepositories` and the docs navigation; membership mutations invalidate `myOrganization` and the docs navigation (a left organization hides repositories).

## Risks / Trade-offs

- [One more query per signed-in read] → it is a single indexed join; add an index on `member(user_id)` only if the existing ones don't cover it (inspect, and propose it to the user as part of the migration).
- [Better Auth's HTTP organization endpoints stay reachable and let users do things our procedures forbid differently] → their rules are Better Auth's defaults with the same roles, and decision 2 keeps visibility right whatever they do. Locking them down is a separate change.
- [Invitations match by email, and an account's email could change] → the email is read from the session user at accept time; a changed email simply stops matching.
- [Admins can't read shared repositories] → intended: the existing rule is that admins don't read users' repositories.

## Migration Plan

1. User approves; the agent adds the table and relations to the Drizzle schema.
2. The user runs `bun run db:generate` and applies it; nothing to backfill (no shares exist).
3. Deploy backend and frontend together. Rollback: revert the code; the empty or unused table is harmless.

## Open Questions

None. Leaving an organization asks for a confirmation that says the user's shares with it end, without listing the repositories.
