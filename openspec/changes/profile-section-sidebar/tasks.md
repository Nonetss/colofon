## 1. Registry and navigation helpers

- [x] 1.1 Add the `profile-api-keys` (`/me/api-keys`), `profile-secrets` (`/me/secrets`) and `profile-skills` (`/me/skills`) children to the `profile` surface in `lib/app-surfaces.ts` (labels, Spanish descriptions, icons; add an `entities` icon for skills to `lib/icon-registry.ts` if none fits); verify with a case in `tests/unit/lib/app-surfaces.test.ts` that `getChildSurfaces("profile")` returns the three in order
- [x] 1.2 In `lib/site-nav.ts`, add `sectionSidebarLinks(id, overviewLabel)`, export the most-specific matcher as `currentNavHref(pathname, hrefs)`, and rebuild `adminSidebarLinks` on the new helper; verify with `tests/unit/lib/site-nav.test.ts` cases for the profile rows, the admin rows unchanged, and `/me/secrets` resolving to `/me/secrets`, not `/me`
- [x] 1.3 Switch `AdminShell`'s sidebar (`features/admin/shell/components/app-sidebar.tsx`) from its hand-written `isLinkActive` to `currentNavHref`; verify `check-types` passes and `/admin/git/manual` still marks only Git (covered by the site-nav test)

## 2. Page-sidebar toggle

- [x] 2.1 Move `features/docs/shared/model/sidebar-toggle.ts` to `src/lib/page-sidebar.ts` with neutral names (`data-page-sidebar`, `page-sidebar:toggle`) and `use-has-docs-sidebar` to `src/hooks/use-has-page-sidebar.ts`; update the docs barrel, `Docs.astro`, the docs sidebar listener and `NavbarAuthenticated`; verify with a new `tests/unit/lib/page-sidebar.test.ts` (attribute detection, event dispatched) and `check-types`

## 3. Section layout

- [x] 3.1 Create the section sidebar under `features/app-shell/sidebar/` (persisted `SectionSidebarChrome` with `SidebarProvider` reading the `sidebar_state` default, and `SectionSidebar` taking its section as a prop (one persisted island per section), rows from `sectionSidebars`, current row read from `usePathname()`, current row from `currentNavHref`, collapse control at its foot, listening to `page-sidebar:toggle` to open the mobile sheet and closing it on `astro:after-swap`), using the deleted version at `git show 214dc83^:apps/frontend/src/features/app-shell/sidebar/` as the starting point; verify `check-types` and Biome
- [x] 3.2 Create `layouts/WithSidebar.astro` (`title`, `section`, `scrollToTop`): `Layout` with `footer={false}` and `animateContent={false}`, `data-page-sidebar` on the body, the persisted sidebar island, a window-scrolling `<main>` offset by the sidebar width with the page fade, and the `/login` redirect without a user; verify by rendering `/me` in a later task
- [x] 3.3 Check the gating for `/me/*` in `src/middleware.ts` matches `/me` today (same roles allowed); verify by reading the path rules and adjusting only if `/me` is listed explicitly

## 4. Profile pages

- [x] 4.1 Split `features/profile/overview` into the `account`, `api-keys`, `secrets` and `agent-skills` slices, each with its `*-page.tsx` (`QueryProvider` + `PageShell`) and `*-content.tsx`; sub-pages head with `PageHero surface="profile-…"` instead of their `<h2>` label; `features/profile/index.ts` exports the four pages; verify `check-types`, Biome and that no file imports another slice's internals
- [ ] 4.2 Point `pages/me/index.astro` at `WithSidebar` with the account page and add `pages/me/api-keys.astro`, `pages/me/secrets.astro` and `pages/me/skills.astro`; verify `check-types` and ask the user for a screenshot of `/me` and `/me/secrets` on desktop and phone

## 5. Addresses in texts

- [x] 5.1 Update the user-facing addresses in `packages/api/src/v1/docs/llm-text.ts` (keys → `/me/api-keys`, secrets → `/me/secrets`, setup-prompt comment → `/me/skills`), `v1/mcp/secret-tools.ts` and `v1/secret/request/plan.ts` (→ `/me/secrets`), plus `packages/api/skills/colofon/SKILL.md` (→ `/me/api-keys`); update `tests/v1/docs/llm-text.test.ts` and `tests/v1/mcp/secret-tools.test.ts` first so they fail, then pass with `bun run test`
- [x] 5.2 Update the `/me` setup-prompt references in `doc-example/.agents/skills/colofon-documentation/SKILL.md` and `references/layout.md` to `/me/skills`; verify with a grep for `/me` under `doc-example/.agents`

## 6. Conventions and validation

- [x] 6.1 Update `.agents/skills/stack/references/frontend/navigation-and-layouts.md` (the `WithSidebar.astro` layout, the section sidebar, `sectionSidebarLinks`, the page-sidebar toggle replacing the docs one, `/me` no longer on `Layout.astro`), and the `/me` mentions in `references/api/agent-skills.md` and `references/api/mcp.md`; verify every cited path exists
- [x] 6.2 Run `bun run check-types`, Biome, `bun run tailwind:check` and `bun run test`, and report the results

## 7. Renaming API keys

- [x] 7.1 Add `v1.apiKey.update` (PATCH, id + trimmed name of 1 to 32 characters, renames through Better Auth's `updateApiKey`, returns the key as `list` maps it); verify with the `apiKey.update` cases in `packages/api/tests/v1/api-key/handler.test.ts`, seen failing first
- [x] 7.2 Add `useApiKeyUpdate` (optimistic rename) and `ApiKeyRenameDialog` to `features/api-keys/manage`, and a "Cambiar nombre" button on each row of `/me/api-keys`; verify `check-types` and Biome

