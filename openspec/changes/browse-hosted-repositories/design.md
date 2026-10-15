## Context

Hosted repositories (`host-content-repositories`) are bare git repositories under the hosted root (`.hosted/<id>/`), and `packages/api/src/v1/content/hosting.ts` owns which rows are hosted (`isHosted`) and where their folder is (`gitSourceOf`). `v1.content.listRepositories` already returns `hosted` and `pushUrl`, and `v1.content.listBranches({ slug })` already reads a hosted repository's branches and default branch from its bare repository. `packages/content/src/source.ts` exports `spawnGit`. On the frontend, `useQueryParam` (`src/hooks/use-query-param.ts`) syncs one param with `replaceState`, so it never adds history entries.

## Goals / Non-Goals

**Goals:**
- Read folders and files of any branch straight from the bare repository, with git, without checking anything out.
- A screen whose every view (repository, branch, folder or file) is a URL, with working back/forward.

**Non-Goals:**
- External repositories, commit history, blame, diffs, search, Markdown/MDX rendering, syntax highlighting, downloading raw files, any write.
- Tags or commits as the browsed ref: branches only.

## Decisions

### 1. Git reads in `packages/content/src/browse.ts`

Two functions over a bare repository folder, both with `--git-dir=<folder>` and run from `tmpdir()` like `listRemoteBranches`, so git never reads the platform's own checkout:

- `readFolder(folder, branch, path)` → `{ ok: true, entries } | { ok: false }`: `git ls-tree -z --long refs/heads/<branch>:<path>` (an empty path after the colon is the root tree). Output records are `<mode> <type> <object> <size>\t<name>\0`; `tree` → `folder`, `blob` → `file` with its size, `commit` → `submodule`. Sorted folders first, then by name (`localeCompare`).
- `readFile(folder, branch, path, limits)` → `{ ok: false } | { ok: true, size, kind: "text", content } | { ok: true, size, kind: "binary" | "too-large" }`: `git cat-file -t` must answer `blob`, `git cat-file -s` gives the size, and only a file within the limit is read with `git cat-file blob`. Binary means a NUL byte in the first 8000 bytes, git's own heuristic. Text is decoded with a non-fatal `TextDecoder("utf-8")`.

Any git failure (unknown branch, missing path, a blob where a tree is expected, a missing bare folder) answers `{ ok: false }`, which the handler maps to `NOT_FOUND`. The two don't distinguish "no such branch" from "no such path": the screen doesn't need it, and the message stays generic.

**Why `refs/heads/<branch>:` instead of `<branch>:`.** The prefix pins the lookup to branches (a tag or a SHA named like a branch can't shadow it) and the argument can never start with `-`, so it can't be read as an option. The input also refuses `:` and a leading `-` in `branch`, and every path segment that could climb (`..`) or is empty; git object paths can't leave the tree anyway, so this is belt and braces.

Limits are constants: 512 KiB per file (`MAX_FILE_BYTES`), 8000 bytes sniffed (`BINARY_SNIFF_BYTES`). A git child gets the 10 s timeout `spawnGit` already takes.

Alternatives: reading the clone under `.content/` (only has the checked-out ref, and only after a sync) or a JS git implementation (a new dependency for what two git commands do).

### 2. Procedures `v1.content.readFolder` and `v1.content.readFile`

Admin-only, `GET` (inputs are three short strings; nothing secret), following the feature's split (`input.ts`, `output.ts`, handler method, `router.ts` wiring). The handler finds the row by slug, refuses rows that aren't `isHosted` with `NOT_FOUND` (same message as an unknown slug, so a non-hosted repository isn't distinguishable from a missing one), and calls `browse.ts` with `gitSourceOf(row, hostedRoot)`. No `ensureHostedRepo` here: a read never creates the bare repository (`GET` is safe), and a missing folder simply has no branches.

Output of `readFile`: `{ path, size, kind: "text" | "binary" | "too-large", content: string | null }`; `content` is set only for `text`.

### 3. Screens: `features/admin/git` and `features/admin/git-repository`

Two routes, two slices, so each `client:only` island only downloads its own graph (the stack rule for route pages):

- **`/admin/git`** (`features/admin/git`, surface `admin-git` under `admin`): `ResourceOverview` with the hosted repositories (`listRepositories` with a `select` keeping `hosted`) as a grid of cards, a `SearchInput` in its `filters` slot whose text lives in `?q=` (`useQueryParam`). Matching is a pure `matchesSearch(repository, query)` in `model/`: every word of the query, folded with `lib/fold-text`, must appear in the folded name or slug. Each card names the repository (its title is an `AppLink` to the code screen), its slug and published ref, and its git URL with `CopyButton`; a "Ver código" button links to the code screen too (no whole-card link, which would nest the copy button inside a link).
- **`/admin/git/[repo]`** (`features/admin/git-repository`, surface `admin-git-repository`, top-level like `cron-detail` since `children` are listed in the admin sidebar and a dynamic one must not be; no `nav`, `adminOnly`): `pages/admin/git/[repo]/index.astro` in the `Admin` layout passes the slug to `GitRepositoryPage`. The content finds the slug among the hosted repositories (one shared `listRepositories` cache with the list screen); a back link to `/admin/git` sits above the hero.
- **Data:** `listBranches({ slug })` for the branch select and its default; `readFolder` / `readFile` with `skipToken` until the branch is resolved. Inputs come from named functions in `model/git-location.ts`, so no ternary builds a query input.
- **Location in the URL:** `?branch=<name>&path=<folder>&file=<path>` (the repository is the route). `useQueryParam` can't do it (one param, `replaceState`), so the slice has `useGitLocation()` that reads the three params, navigates with `history.pushState` (one entry per click) and resyncs on `popstate` and `astro:page-load`. Parsing and serializing the location, the starting branch (`ref` if it is a branch, else the default branch, else the first), the breadcrumb segments and line counting are pure functions in `model/git-location.ts`, with unit tests.
- **Fallbacks:** when `readFolder` or `readFile` answers `NOT_FOUND` for a URL path (e.g. after switching to a branch without that folder), the hook replaces the location with the branch root (`replaceState`, so back doesn't loop); an unknown `branch` shows the starting branch.
- **Listing:** a `DataTableView` with `git-tree-columns.definition.tsx` (name with a folder/file icon, opened through `renderControl`; size), in the order the API gives (no sorting UI).
- **File view:** a line-number gutter and the text in two `<pre>`s (only the text is selectable), monospaced, scrolling sideways; for `binary`/`too-large`, the size and a sentence. A breadcrumb above both, from the repository name to the folder, plus the file name.
- **Empty states:** no hosted repository / no search match on the list; on the code screen, a repository with no branches (its `pushUrl` to copy) and an unknown slug (link back).

## Risks / Trade-offs

- [A huge folder (thousands of entries) renders slowly] → Content repositories are small; no pagination for now. Revisit if one ever needs it.
- [Non-UTF-8 text shows replacement characters] → Acceptable for a read-only viewer; the content contract is UTF-8 YAML/MDX.
- [A push while browsing changes what a branch points to] → Each query reads the branch tip at request time; the screen may mix two commits across clicks. Acceptable; TanStack Query's refetch on focus brings it back in line.

## Migration Plan

Additive: two new procedures and a new page. No migration, no config. Archive `host-content-repositories` before or together with this change, since this one builds on its specs and code.
