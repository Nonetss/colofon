## Why

`/me` is a single long page that stacks the account details, the API keys, the secrets and the agent-skills prompt one under the other, and it will keep growing as more personal tools arrive. The template had an app-shell layout for exactly this (`WithSidebar.astro`: the site navbar on top, a section sidebar on the left built from the surface registry, the page beside it), removed in `214dc83` together with crons and home. Bringing that format back, adapted to the current reader, gives `/me` one page per concern and a place where new ones are a registry entry plus a page.

## What Changes

- Recover `WithSidebar.astro` as the layout for sections with sub-pages outside `/admin`: `Layout.astro`'s navbar, a section sidebar on the left (collapsible to icons, kept across client-side navigations within the section) and the page beside it, with the window scrolling as it does in the reader. It is not a copy of the old one: no inner scroller and no scroll-restoration hook, which the current layouts don't need.
- A generic section sidebar whose rows come from a surface and its child surfaces in `app-surfaces.ts` (the section's own page first, then each child), marking only the most specific current row. `adminSidebarLinks` is projected through the same helper.
- Below the medium breakpoint the section sidebar opens as a sheet from the navbar's menu button, the same button the documentation sidebar uses today, generalized from "documentation sidebar" to "the page's sidebar".
- The `profile` surface gets child surfaces, and `/me` splits into four pages under `WithSidebar`:
  - `/me` — the account (avatar, name, email, password, account id, member since);
  - `/me/api-keys` — the API keys;
  - `/me/secrets` — the secrets;
  - `/me/skills` — "Skills para tu IA", the setup prompt.
- `features/profile/overview` splits into one slice per page.
- A user can rename their API keys on `/me/api-keys`, through a new `v1.apiKey.update` procedure.
- **BREAKING** (addresses only): the texts that send a user to `/me` to create keys or secrets, or to the setup prompt, point to the specific page instead (`/me/api-keys`, `/me/secrets`, `/me/skills`): the `/llms.txt` guide, the MCP `secrets` tool, the secret-request errors, the `colofon` platform skill and the writing skills in `doc-example/.agents/skills/`. `/me` keeps working, now as the account page.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-navigation`: a `WithSidebar.astro` layout with a registry-driven section sidebar for the profile section, the navbar's menu button opening whichever sidebar the page has, `/me` no longer on `Layout.astro`, and the section sidebar under the current-link rules.
- `api-key-management`: the API keys move from the profile page to `/me/api-keys`, and a user can rename their own keys (`v1.apiKey.update`).
- `secret-management`: the secrets section moves from the profile page to `/me/secrets`.
- `secret-requests`: the MCP `secrets` tool points to `/me/secrets` when the user has none.
- `documentation-llm-text`: the `/llms.txt` guide names `/me/api-keys` (and `/me/secrets`) instead of `/me`.

## Impact

- `apps/frontend`: new `layouts/WithSidebar.astro`; section sidebar under `features/app-shell/`; `lib/app-surfaces.ts` (profile children) and `lib/site-nav.ts` (section links helper); the docs sidebar toggle moved to a shared page-sidebar helper used by the navbar, the documentation sidebar and the section sidebar; `features/profile/` split into slices; new `pages/me/{api-keys,secrets,skills}.astro`; unit tests for the new `src/lib` helpers.
- `packages/api`: user-facing addresses in `v1/docs/llm-text.ts`, `v1/mcp/secret-tools.ts`, `v1/secret/request/plan.ts`, and `skills/colofon/SKILL.md`, with their tests.
- `doc-example/.agents/skills/`: the setup-prompt references move to `/me/skills` (a subtree; pushing it upstream is the user's call).
- `.agents/skills/stack/references/` (`frontend/navigation-and-layouts.md`, `api/agent-skills.md`, `api/mcp.md`) updated to state the new layout and addresses.
- One new procedure, `v1.apiKey.update`; no database or migration changes.
