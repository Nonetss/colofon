## 1. Database (stop for the user)

- [x] 1.1 Add `contentRepositoryShare` (design §1) to `packages/db/src/schema/content/content.ts` with its relations and exported types, and check whether `member` already has an index on `user_id`; verify `check-types` in `packages/db`
- [ ] 1.2 Stop and ask the user to run `bun run db:generate` and apply the migration (propose the `member(user_id)` index if missing); do not continue with tasks that need the table at runtime until they confirm

## 2. Repository audience (packages/api)

- [x] 2.1 Change `RepositoryAudience`'s user case to `{ userId, shared }` and make `audienceOfUser` async with the shared-repositories query behind the store (design §2–3); update `audienceFilter` and `isVisibleTo`; verify `tests/v1/content` cover: shared with the caller's org and owner still a member → visible; owner left the org → not visible; caller not a member → `NOT_FOUND`; shared through two orgs and caller leaves one → still visible
- [x] 2.2 Await the new `audienceOfUser` in every caller (`rg "audienceOfUser\(" packages/api/src`: docs, skills, MCP, sync) and let `syncRepository` sync shared repositories; verify `check-types` and `bun test` in `packages/api`
- [x] 2.3 Add `sharedBy` to `v1.docs.nav`'s repository output from `audience.shared` (design §6); verify a docs test asserts the organization name for a shared repository and none for own or platform ones

## 3. Self-service organizations (packages/api)

- [x] 3.1 Create `src/v1/my-organization/` with `list`, `get`, `create`, `update`, `delete` on `sessionProcedure`, membership lookup and role predicates (design §4), moving the slug schema and invitation TTL to `src/shared` if both features need them; register `myOrganization` in `v1/router.ts`; verify tests for: non-member `NOT_FOUND`, member `FORBIDDEN` on rename/delete, duplicate slug `CONFLICT`, creator becomes `owner`, `get` hides invitations from members, API key `FORBIDDEN`
- [x] 3.2 Add `invite`, `cancelInvitation`, `updateMemberRole`, `removeMember` and `leave` with the role and last-owner rules, deleting the leaving or removed owner's shares with that organization in the same transaction; verify tests for every rejection in `organization-membership` (admin removes owner, member invites, last owner leaves or is demoted, duplicate invitation/member) and that leaving drops the shares
- [x] 3.3 Add `listInvitations`, `acceptInvitation` and `rejectInvitation` matched on the caller's email; verify tests for: someone else's, expired and non-pending invitations `NOT_FOUND`, accept creates the member with the invitation's role and marks it accepted, reject marks it rejected

## 4. Sharing procedure (packages/api)

- [x] 4.1 Add `v1.content.shareMyRepository` (PUT, `sessionProcedure`) replacing the shares in one transaction, and `organizations` on the owner procedures' repository output (design §5); verify tests for: not the owner `NOT_FOUND`, an org the owner isn't in `NOT_FOUND` with nothing written, replacing the list, the output listing the organizations by name
- [x] 4.2 Run `bun run test`, `check-types` and Biome for `packages/api`; verify all pass

## 5. Frontend

- [x] 5.1 Add the `/me/organizations` child surface to `app-surfaces.ts` and `pages/me/organizations.astro`; verify `check-types` and that the profile sidebar needs no change
- [x] 5.2 Build `features/organizations/overview`: pending invitations with accept/decline, organization list with role and member count, empty state, create dialog with a slug suggested by `slugify`, recovering what fits from `git show d11a53f^:apps/frontend/src/features/admin/organizations/...`; verify `check-types` and Biome
- [x] 5.3 Build `features/organizations/detail`: members table (`DataTableView`), pending invitations for owners/admins, invite dialog, role select, remove, rename, delete and leave with `ConfirmDialog`, each action shown only when the role allows it; mutations invalidate `myOrganization` and the docs navigation; verify `check-types` and Biome
- [x] 5.4 In `features/content-repositories`, add the organizations field to the repository form (link to `/me/organizations` when there are none), call `shareMyRepository` after save when the selection changed, and show the organizations on each card; verify `check-types` and Biome
- [x] 5.5 Show `sharedBy` as secondary text in the reader's repository selector; verify `check-types`
- [x] 5.6 Add unit tests in `apps/frontend/tests/unit/` for any new `src/lib` helper or shared component with logic (e.g. the role-permission predicates if they live in `src/lib`); verify `bun run test` and `bun run tailwind:check`

## 6. Conventions and final check

- [x] 6.1 Update `.agents/skills/stack/references/api/agent-skills.md` (the `RepositoryAudience` description) and `references/api/mcp.md` if it states owner-only visibility; verify every cited path exists
- [x] 6.2 Run `bun run check-types`, Biome and `bun run test` at the root; verify all pass and report anything that needs the user (migration applied, a manual look at `/me/organizations`)
