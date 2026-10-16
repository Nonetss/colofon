## Context

- `syncRepo()` (`packages/content/src/source.ts`) runs `git fetch --depth 1 origin <ref>`, then a detached checkout of `FETCH_HEAD` and `git clean`. The clone holds a single commit, so `git log` cannot tell files apart.
- The clone is a normal work tree. `gitRunner()` pins `GIT_DIR`/`GIT_WORK_TREE` to it, and `spawnGit()` is the shared, credential-safe way to run git.
- Hosted repositories go through the same sync, with their bare folder as the source. One code path covers both.
- `packages/api/src/v1/content/reader.ts` builds each repository's `Site` lazily (`siteOf` → `buildSite` → `readCatalog` + `readSite`). It caches the build per clone folder and drops the cache after every successful sync.
- `PageHeader.actualizado` is the only date. It comes from the MDX front matter (`pages/header.ts`) or from the entity's `actualizado` (`pages/catalog-pages.ts`). It surfaces as `updated` in `v1/docs` and is rendered by `doc-hero.astro`, with `isStale` (`features/docs/page/model/dates.ts`) choosing the "Revisar" mark.

## Goals / Non-Goals

**Goals:**

- Every page that comes from one file shows when that file last changed, with no writer effort.
- Keep `actualizado` as the reviewed-data date, with its precedence and its "Revisar" mark unchanged.
- One git process per site build, not one per page.

**Non-Goals:**

- Following renames across history (`--follow`) or author dates. The commit that moved a file counts as its last edit.
- Showing who edited, a history list, or links to commits.
- Storing dates in the database or changing the content contract.
- Dating generated pages (catalog index, type pages, folder pages without `index.mdx`) from their children.

## Decisions

### Full history instead of shallow or partial clones

The fetch becomes `git fetch --quiet origin <ref>`. When `git rev-parse --is-shallow-repository` says `true` (clones made before this change), it adds `--unshallow`. Calling `--unshallow` on a complete repository is an error, hence the check.

- *Alternative: `--filter=blob:none` (partial clone).* It would keep blobs lazy, but it needs promisor config (`extensions.partialClone`) on existing clones. Git also ignores it on the local-path transport hosted repositories use. Documentation repositories are small text, so the full history costs little.
- *Alternative: `--shallow-since`.* Files older than the cutoff would get a wrong date. Rejected.

### One `git log` pass, read when the site is built

A new `readEditDates(root, folders)` in `packages/content/src/source.ts` runs, through `spawnGit` with the clone pinned like `gitRunner`:

```
git -c core.quotePath=false log --format=format:%x01%cs --name-only HEAD -- docs catalogo
```

It splits the output on `\x01`. The first line of each chunk is the date (`%cs`, the committer date in the committer's time zone) and the other lines are paths. The first date seen for a path wins, because `log` lists the newest commits first. It returns a `ReadonlyMap<string, string>` keyed by root-relative path (`docs/red/dns.mdx`), with `DOCS_DIR`/`CATALOG_DIR` as the pathspecs.

`buildSite` in `reader.ts` calls it alongside `readCatalog`. The dates are therefore always those of the checkout the site was built from, and they share the site's cache and its invalidation after a sync. If the read throws, it logs a warning with the repository and uses an empty map. Reading dates never fails a site build or a sync.

- *Alternative: read the dates inside `syncRepo` and store them next to the sync result.* That needs a second cache with its own lifetime, and it breaks after a restart until the boot sync finishes. Rejected for the lazy read above.
- *Alternative: `git log -1 -- <file>` per page.* That is N processes per build. Rejected.

Merge commits list no files without `-m`. A file changed on a merged branch therefore takes its branch commit's date. That is acceptable, and identical for squash or rebase workflows.

### `editado` on `PageHeader`, `edited` in the API

- `PageHeader` gains `editado: string | null`, set outside header validation. `editado` is never accepted in front matter: the existing unknown-key rule reports it.
- `readSite` gets the map as a new argument. An MDX page looks up `docs/<file>`. A folder page without `index.mdx` and `site.ts`'s synthetic headers get `null`.
- `catalog-pages.ts` looks up `catalogo/<type>/<id>.yaml` for entity pages, with the type id and the entity id from `Entity`. Index and type pages get `null`.
- `v1/docs/output.ts` adds `edited: z.string().nullable()` beside `updated`, and `handler.ts` maps `header.editado`. The field is additive, so no client breaks.

### The header picks one date in a pure helper

`features/docs/page/model/dates.ts` gains `headerDate(updated, edited, now)`. It returns `{ label, tone }` or `null`:

- `updated` set: "Datos del …", or "Revisar · datos del …" with the primary tone when `isStale`.
- otherwise, `edited` set: "Editado el …", muted.
- otherwise: `null`.

`doc-hero.astro` replaces `updatedTone` and `updatedLabel` with it. The date block also shows when only `edited` is set. One date shows at a time, so the header doesn't grow.

## Risks / Trade-offs

- [A mass edit (reformat, rename of a folder) resets every touched page to "Editado el today"] → It is labelled as an edit, not as data freshness, and never triggers "Revisar". `actualizado` stays the way to state a review.
- [The first sync after deploy fetches the whole history of every repository] → It happens once per repository and the history is small text. A failure keeps the last checkout, as any sync failure does today.
- [Very large histories make the `log` pass slow] → It runs once per site build, which already parses every page, and it is limited to `docs/` and `catalogo/`. It can be revisited if a repository proves slow.
- [Git older than 2.21 lacks `%cs`] → The Docker images ship current git. Native dev uses the system git. It is noted in tasks to check `git --version` in the backend image.

## Migration Plan

No data migration. Deploying the backend makes the next sync deepen existing shallow clones. Rolling back leaves deep clones in place, which the old `--depth 1` fetch keeps working with. The extra `edited` field is ignored by an older frontend.
