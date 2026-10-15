## Why

The platform now hosts content repositories itself (`host-content-repositories`), but the only way to see what is inside one is to clone it. An admin wants to check at a glance what each hosted repository holds, on any branch, from the admin panel, as they would on a git forge, without leaving the browser.

## What Changes

- New admin-only, read-only procedures under `v1.content` that read a hosted repository's bare repository: the entries of one folder on one branch, and the content of one file on one branch.
- New admin screen “Git” at `/admin/git`, listed in the admin navigation: the hosted repositories as cards, with a search field. Opening a card goes to `/admin/git/<slug>`, a code screen where the admin switches between its branches, walks its folders and opens a file as text. The branch and path live in the page URL, so a view can be linked and the browser's back button walks back through it.
- Files are shown as plain text with line numbers; binary files and files over a size limit are not shown inline, the screen says why.
- Only hosted repositories are browsable; external ones keep being managed at `/admin/content`. Nothing here writes: no editing, uploading, commit history or Markdown rendering.

## Capabilities

### New Capabilities

- `content-git-browser`: reading a hosted repository's folders and files on any branch through admin procedures, and the `/admin/git` screen that browses them.

### Modified Capabilities

None. The screen reuses the existing repository list and branch listing procedures without changing them.

## Impact

- Code: `packages/content` (read a folder and a file of a bare repository with the git CLI), `packages/api/src/v1/content` (two `GET` procedures, input, output, handler), `apps/frontend` (new `features/admin/git` and `features/admin/git-repository` slices, `pages/admin/git/index.astro` and `pages/admin/git/[repo]/index.astro`, the `admin-git` and `admin-git-repository` surfaces in `app-surfaces.ts`).
- API: two new admin `GET` procedures; no existing procedure changes.
- Database, gateway and Docker: none. `/admin/git` is a frontend page; the gateway's `/git/*` route to the git endpoint does not match it.
- Depends on `host-content-repositories` (hosted repositories and their bare repositories), which must be archived first or together.
