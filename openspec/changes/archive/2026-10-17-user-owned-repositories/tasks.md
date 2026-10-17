## 1. Data model

- [x] 1.1 Propose the `owner_id` column (nullable, references the user, deleted with them) on `content_repository` in `packages/db/src/schema/content/content.ts` once the user confirms the schema edit, then hand the migration to the user; verify with `bun run check-types`. Add the field to the fake rows in `packages/db/testing/rows.ts`.

## 2. Visibility in the backend

- [x] 2.1 Give `RepositoryStore` (`packages/api/src/v1/content/reader.ts`) a viewer on `find` and `list`, leaving `recordSync` and `syncAll` unscoped; verify with reader tests: owner sees own, others and admins do not, cron syncs all.
- [x] 2.2 Pass the session user from `v1.docs`, `v1.skills` and the MCP tools (and the `llms.txt` builders) through the store; verify with tests that a stranger gets `NOT_FOUND` on a page, file, search and skill of a private repository and that it is absent from navigation and `repositories`.
- [x] 2.3 Make the schema endpoints answer `NOT_FOUND` for owned repositories and the admin procedures act only on `owner_id is null`; verify with `packages/api/tests/v1/content/` tests.

## 3. Owner procedures

- [x] 3.1 Add a URL check for user-typed remotes in `packages/content` (https only, no loopback/private/link-local/unspecified hosts, name resolution checked) and run it before every sync of an owned repository; verify with unit tests for literals, names and the rebinding case.
- [x] 3.2 Disallow the `file`, `ext` and `ssh` git transports for the clones; verify with a sync test of a `file://` remote that fails.
- [x] 3.3 Add `protectedProcedure`s to list, create, edit, delete and read branches of one's repositories (input/output/handler/router per `references/api/layering.md`), with the 10-repository limit, global slug uniqueness and `NOT_FOUND` for others' slugs; allow `syncRepository` for readable repositories; verify with `repositories.test.ts`-style tests for every scenario in the spec.

## 4. Profile screen

- [x] 4.1 After `profile-section-sidebar` lands, add the `profile` child surface `/me/repositories` in `app-surfaces.ts` and `pages/me/repositories.astro` on `WithSidebar`; verify the sidebar shows it and `check-types` passes.
- [x] 4.2 Build the `features/profile/repositories` slice reusing the admin content card, form and branch select where they fit (search `features/admin/content` first), with empty state and usage counter in Spanish; verify with component tests and `bun run test`.

## 5. Docs and validation

- [x] 5.1 Update the `stack` references that state who reads which repository (`api/mcp.md`, `api/layering.md` and `frontend/navigation-and-layouts.md` as they apply); verify every cited path exists.
- [x] 5.2 Run `bun run check-types`, Biome, `bun run tailwind:check` and `bun run test`, and `openspec validate user-owned-repositories`; all pass.
