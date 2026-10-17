## Context

- `/me` is `pages/me/index.astro` on `Layout.astro`, mounting `ProfilePage` (`features/profile/overview`), whose `ProfileContent` renders the account header, the metadata list, `ProfileApiKeys`, `ProfileSecrets` and `ProfileAgentSkills`, all in the `overview` slice.
- The old `WithSidebar.astro` (deleted in `214dc83`, readable with `git show 214dc83^:apps/frontend/src/layouts/WithSidebar.astro`) wrapped `Layout` with `hideFooter overlayNavbar animateContent={false}`, persisted a `WithSidebarChrome` island (`SidebarProvider` + `SectionSidebar`) and scrolled the page inside `<main data-app-scroller>`, with a persisted `WithSidebarHeader` island restoring that scroller's offset (`hooks/use-scroll-restoration.ts`, ~240 lines plus a 340-line test) and forwarding it to the navbar (`lib/content-scroll-event.ts`). `SectionSidebar` read its section from `siteNavItems`/`getSidebarSection`, which only list surfaces with `nav`; no surface declares `nav` today.
- `Docs.astro` lets the window scroll, keeps its sidebar sticky under the navbar, and below `md` opens it as a sheet from the navbar's menu button through `features/docs/shared/model/sidebar-toggle.ts` (`data-docs-sidebar` on `<body>`, `docs-sidebar:toggle` window event).
- `AdminShell` builds its rows from `adminSidebarLinks` (`lib/site-nav.ts`): a "Resumen" row for `/admin` plus `getChildSurfaces("admin")`. Its `isLinkActive` special-cases `/admin` by hand. `site-nav.ts` already has a private `getCurrentNavHref` that picks the most specific matching href.

## Goals / Non-Goals

**Goals:**
- A reusable section layout outside `/admin` whose sidebar is entirely projected from a surface and its children.
- The profile split into one page and one slice per concern, reusing the current components unchanged in behavior.
- Mobile navigation for the section through the navbar's existing menu button.

**Non-Goals:**
- Restoring crons, home, `navbar-pill`, `navbar-mobile-menu` or anything else deleted alongside `WithSidebar`.
- Changing `AdminShell`'s look or moving `/admin` to the new layout.
- Any API, contract or database change. The procedures `/me` uses stay as they are.

## Decisions

### Window scroll, not an inner scroller

The new `WithSidebar.astro` renders `Layout` with `footer={false}` and `animateContent={false}`, a persisted sidebar island and a normal `<main>` that flows in the window, like `Docs.astro`. The sidebar uses shadcn's `Sidebar` (fixed, offset by `--navbar-height` as the old `SectionSidebar` did), so it stays in place while the window scrolls.

*Why:* the inner scroller is what required `use-scroll-restoration`, `content-scroll-event` and the `overlayNavbar` spacer. With the window scrolling, the browser's own scroll restoration, anchors and `ScrollToTopButton` work as in the reader, and none of that code comes back. *Alternative:* restore the old layout verbatim, which brings back roughly 600 lines (hook plus test) for a section of short pages.

### One persisted sidebar island per section

`WithSidebar.astro` takes `title` and `section` (a key of `sectionSidebars` in `site-nav.ts`) and passes `section` to the island (`client:only="react"`), persisted as `section-sidebar-<section>`. A persisted island freezes its first props, but only within the same persist name: moving to another section mounts that section's own island, so the prop never goes stale. The current row, which does change within a section, is read from `usePathname()`. *Alternative:* resolve the section from the URL among the surfaces with children (what the old `SectionSidebar` did through `siteNavItems`). Rejected: it needs a rule to pick the section and gains nothing while the persist name already separates sections.

### Rows come from one `site-nav` helper shared with admin

Add `sectionSidebarLinks(id, overviewLabel)` to `lib/site-nav.ts`: a row for the section's own path with `overviewLabel` and the surface's icon, then `getChildSurfaces(id).map(toSubItem)`. `adminSidebarLinks` becomes `sectionSidebarLinks("admin", "Resumen")`; the profile uses `sectionSidebarLinks("profile", "Cuenta")`. The overview label is passed by the caller (not a new `AppSurface` field) because only these two sections need one. Export the existing `getCurrentNavHref` as `currentNavHref(pathname, hrefs)` so both sidebars mark only the most specific row; `AdminShell`'s hand-written `isLinkActive` switches to it. Both helpers get unit tests.

*Alternative:* restore `siteNavItems`-based `getSidebarSection` and give `profile` a `nav` config. Rejected: `nav` means "navbar placement" in the registry, and the navbar renders no sections anymore.

### Generic page-sidebar toggle

Move `sidebar-toggle.ts` from `features/docs/shared/model` to `src/lib/page-sidebar.ts` with neutral names (`PAGE_SIDEBAR_ATTRIBUTE = "data-page-sidebar"`, `PAGE_SIDEBAR_TOGGLE_EVENT = "page-sidebar:toggle"`, `togglePageSidebar`, `hasPageSidebar`, and the `useHasPageSidebar` hook in `src/hooks`). `Docs.astro` and `WithSidebar.astro` both set the attribute; the navbar button dispatches the event; the docs sidebar and the section sidebar each listen (the section one calls shadcn's `setOpenMobile`). Only one sidebar exists per page, so one event suffices. The section sidebar closes its sheet on navigation (`astro:after-swap`).

*Why:* the navbar already has exactly the mechanism; a second attribute/event pair would make the navbar know about every sidebar kind. *Alternative:* `WithSidebar` sets `data-docs-sidebar` too — rejected, it names the wrong thing.

### Profile slices

`features/profile/` becomes:

- `account/` — `ProfileAccountPage`/`ProfileAccountContent` (today's header + metadata + the two dialogs, with `use-profile-mutations`);
- `api-keys/` — `ProfileApiKeysPage` around today's `ProfileApiKeys`;
- `secrets/` — `ProfileSecretsPage` around `ProfileSecrets`;
- `agent-skills/` — `ProfileAgentSkillsPage` around `ProfileAgentSkills`.

Each `*-page.tsx` is `QueryProvider` + `PageShell` + content. Sub-pages head with `PageHero surface="profile-…"`, and the current `<h2 variant="label">` headings and their `aria-labelledby` become the hero's title. `features/profile/index.ts` exports the four pages. No `shared/` slice unless two slices actually share code.

### Surfaces and routes

`app-surfaces.ts`: `profile` gains `children` `profile-api-keys` (`/me/api-keys`, "API keys", `entities.apiKey`), `profile-secrets` (`/me/secrets`, "Secretos", `entities.secret`) and `profile-skills` (`/me/skills`, "Skills para tu IA", an icon added to the registry's `entities` group if none fits). Routes: `pages/me/index.astro`, `pages/me/api-keys.astro`, `pages/me/secrets.astro`, `pages/me/skills.astro`. `WithSidebar.astro` redirects to `/login` when `Astro.locals.user` is null, as `Admin.astro` does, so the pages drop their own check.

### Addresses in texts

User-facing pointers move to the specific page: `llm-text.ts` (keys → `/me/api-keys`, secrets → `/me/secrets`, the doc comment about the setup prompt → `/me/skills`), `mcp/secret-tools.ts` and `secret/request/plan.ts` (→ `/me/secrets`), `skills/colofon/SKILL.md` (→ `/me/api-keys`), `doc-example/.agents/skills/colofon-documentation/{SKILL.md,references/layout.md}` (→ `/me/skills`). The account menu keeps linking to `/me`.

## Risks / Trade-offs

- [A persisted island and a fixed sidebar can overlap the footer area or the navbar] → no footer on this layout, and the sidebar is offset by `--navbar-height`, as the old one was.
- [External links or bookmarks to `/me` expecting keys or secrets] → `/me` still opens, and the sidebar is one click away; no redirect needed.
- [Renaming the docs toggle touches the reader] → mechanical rename covered by the existing navbar/docs-sidebar behavior; the helper gets its own unit test.
- [`doc-example` is a subtree] → its edits are local; pushing it upstream follows the workaround in memory and is the user's decision.

## Migration Plan

Frontend and text-only; deploys with the usual image. Rollback is reverting the change. No data migration.
