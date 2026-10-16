## 1. Full history in the clones

- [x] 1.1 In `packages/content/src/source.ts` `syncRepo()`, fetch with `git fetch --quiet origin <ref>` (no `--depth`), adding `--unshallow` when `git rev-parse --is-shallow-repository` prints `true`
- [x] 1.2 Let the `createGitRemote` fixture (`packages/content/tests/fixtures/git-remote.ts`) commit with a given date (`GIT_COMMITTER_DATE`/`GIT_AUTHOR_DATE`) if it can't already
- [x] 1.3 Tests in `packages/content/tests/source.test.ts`: after two syncs over three commits the clone is not shallow and holds every commit; a clone made with `--depth 1` beforehand is deepened by the next sync

## 2. Reading the last edit dates

- [x] 2.1 Add `readEditDates(root)` to `packages/content/src/source.ts`: one `git -c core.quotePath=false log --format=format:%x01%cs --name-only HEAD -- docs catalogo` through `spawnGit`, with the clone pinned like `gitRunner` and the folders taken from `DOCS_DIR`/`CATALOG_DIR`. It returns a `ReadonlyMap<string, string>` of root-relative path to `YYYY-MM-DD`, newest commit first wins. Export it from the package barrel if the API needs it through there
- [x] 2.2 Tests in `packages/content/tests/source.test.ts`: two files edited on different dated commits get their own dates; a file edited twice gets the later date; a renamed file gets the rename commit's date; a path with non-ASCII characters (`docs/guía.mdx`) is keyed unquoted; files outside `docs/` and `catalogo/` are absent; a folder that is not a clone rejects

## 3. `editado` on page headers

- [x] 3.1 Add `editado: string | null` to `PageHeader` (`packages/content/src/pages/types.ts`), set to `null` wherever headers are built today (`pages/header.ts`, `pages/site.ts`, `pages/catalog-pages.ts`), without accepting it as a front matter key
- [x] 3.2 Give `readSite` (`pages/site.ts`) the edit-date map as a new argument; an MDX page takes the date of `docs/<file>`, a folder page without `index.mdx` keeps `null`
- [x] 3.3 In `pages/catalog-pages.ts`, an entity page takes the date of `catalogo/<type>/<id>.yaml`; the catalog index and type pages keep `null`
- [x] 3.4 Tests in `packages/content/tests/pages/site.test.ts`: a page gets the date of its file, a page with `actualizado` keeps both dates unchanged, a folder page without index has none, an empty map gives `null` everywhere; in `header.test.ts`, a front matter `editado` is reported as an unknown key
- [x] 3.5 Tests in `packages/content/tests/pages/catalog-pages.test.ts`: an entity page gets its file's date independent of its `actualizado`; the type page and the catalog index have none

## 4. API

- [x] 4.1 In `packages/api/src/v1/content/reader.ts` `buildSite`, read the edit dates with `readEditDates(folder)` alongside `readCatalog`; on failure log a warning with `describeRepository(repository)` and continue with an empty map; pass the map to `readSite`
- [x] 4.2 Add `edited: z.string().nullable().describe(...)` to the page header in `packages/api/src/v1/docs/output.ts` and map `header.editado` in `handler.ts`
- [x] 4.3 Tests: in `packages/api/tests/v1/content/site.test.ts` (or the reader's test), a synced repository's page comes with its commit date and a failing date read still builds the site without dates; in `packages/api/tests/v1/docs/handler.test.ts`, the page response carries `edited` and `updated` independently

## 5. Reader header

- [x] 5.1 Add `headerDate(updated, edited, now)` to `apps/frontend/src/features/docs/page/model/dates.ts`, returning `{ label, tone } | null` per the design ("Datos del …", "Revisar · datos del …", "Editado el …")
- [x] 5.2 Use it in `features/docs/page/components/doc-hero.astro` in place of `updatedTone`/`updatedLabel`, showing the date block when `updated` or `edited` is set
- [x] 5.3 Tests next to the existing `isStale` ones in `apps/frontend/tests/unit/features/docs/page/render.test.ts`: `updated` wins over `edited`; a stale `updated` gets the review label and primary tone; an old `edited` alone is "Editado el" and muted; neither gives `null`

## 6. Checks

- [x] 6.1 Confirm the git in the backend images (`apps/backend/Dockerfile`, `Dockerfile.dev`) supports `%cs` (git ≥ 2.21)
- [x] 6.2 Run `bun run check-types`, Biome and `bun run test` from the repo root
