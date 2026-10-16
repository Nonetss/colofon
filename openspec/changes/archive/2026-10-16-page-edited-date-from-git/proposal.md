## Why

The only date a page header shows today is `actualizado`, typed by hand in the front matter or the entity file. Most pages never set it, so their header shows no date at all, and there is no way to tell whether a page was touched last week or two years ago. The repository's git history already knows when each file last changed. The backend just cannot see it, because it clones with `--depth 1`.

`actualizado` keeps a meaning git cannot give: "the data was checked on this date". It drives the "Revisar" mark. A typo fix must not count as a review. So the git date is added as a second, separate date. It does not replace `actualizado`.

## What Changes

- **Full history in the clones.** A sync fetches the whole history of the repository's `ref` instead of only its last commit. Existing shallow clones are deepened on their next sync.
- **Last edit date per file.** After each successful sync, the backend reads, in one `git log` pass, the date of the last commit that touched each file. Every page read from a file gets that date as its `editado`: an MDX page from its `.mdx`, an entity page from its `catalogo/<type>/<id>.yaml`. Generated pages that come from no single file (catalog index and type pages, folder pages without `index.mdx`) have none.
- **API.** The page header in `docs` gains `edited` (`YYYY-MM-DD` or `null`) next to `updated`. This is an additive field.
- **Reader header.** When the page sets `actualizado`, the header shows it exactly as today ("Datos del …", or "Revisar · datos del …" when it is older than six months). When it doesn't but has an `editado` date, the header shows "Editado el …", muted and never marked for review. When it has neither, no date is shown.
- **No contract change.** Writers keep writing `actualizado` by hand when they want to state when the data was checked. `editado` is never written in a file, so contract version `"1"` stays.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `content-source`: a sync fetches the full history of the `ref` (and deepens a shallow clone), and records each file's last commit date.
- `content-pages`: a page read from a file carries its last edit date (`editado`) from git, separate from `actualizado`.
- `content-catalog-pages`: an entity page is also dated with its entity file's last edit date. Generated index and type pages have none.
- `documentation-reader`: the page header falls back to "Editado el …" when the page has no `actualizado`, and never marks that date for review.

## Impact

- `packages/content`: `source.ts` (fetch without `--depth`, unshallow, read the per-file dates), `pages/types.ts` (`PageHeader.editado`), `pages/site.ts`, `pages/catalog-pages.ts`, plus tests.
- `packages/api`: `v1/content/reader.ts` (gets the dates after a sync and hands them to `readSite`), `v1/docs/output.ts` and `handler.ts` (`edited`), plus tests.
- `apps/frontend`: `features/docs/page/components/doc-hero.astro` (the label choice, preferably moved into `model/dates.ts` with its test).
- Disk and network: clones now hold the full history. That is small for text documentation repositories. The first sync after the deploy fetches the missing history once.
- No database schema or migration change. No new dependency.
