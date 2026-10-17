## Context

The reader treats the clone folder (`cloneFolder(cloneRoot, repository.id)`, `packages/api/src/v1/content/reader.ts`) as the content root: `loadContent`, `readCatalog`, `readSite`, `readEditDates` and the image route all receive it. Sync, the git browser and hosting work on the whole git repository. The editor schemas' `fileMatch` patterns are matched by editors at any depth, so they need no change. See `proposal.md` for the motivation.

## Goals / Non-Goals

**Goals:**
- Read a site from a subfolder of its repository with no change to the content itself.
- One place decides the content root, so no reader path keeps using the clone root by mistake.

**Non-Goals:**
- Auto-detecting the folder.
- Several sites in one repository (that is one repository record per folder, which already works: two records may share a URL).
- Moving the clone, or syncing only the subfolder (sparse checkout).

## Decisions

1. **An explicit `content_path` column, default empty.** Alternative: look for `doc.config.yaml` in the root and then in common folders (`docs/`); rejected because a wrong guess silently shows the wrong site and the user wants to choose. A record per folder also covers two sites in one repository.

2. **The content root is computed once, in the reader.** `contentRootOf(repository)` joins the clone folder and the path and is what `declarationsOf`, `buildSite`, `folderOf` (images) and the caches are keyed by, so changing the path never serves a stale site. The sync keeps keying by the clone folder and URL/ref.

3. **Containment is checked on the resolved path.** The path is validated textually on input (relative, no `..`, no empty or dot segments, at most 255 characters) and again on every read: `realpath` of the folder must be inside `realpath` of the clone. A folder outside, missing, or not a directory is "no content" and logs once, like invalid declarations without a previous valid read. Alternative: trust the input validation; rejected, because a symlink committed to the repository can point anywhere on the server.

4. **Edit dates read the whole `docs/` and `catalog/` under the folder.** `readEditDates(root, folder)` limits `git log` to `<folder>/docs` and `<folder>/catalog`, and strips the `<folder>/` prefix from the paths it returns so callers keep using content-root-relative keys.

5. **Editing the path starts no sync.** The clone is the same; the caches for the old content root are dropped. Create does sync, as before.

## Risks / Trade-offs

- [A symlinked or moved folder escapes the clone] → resolved-path containment on every read (decision 3), with tests for a link out.
- [Two records of one repository clone it twice] → accepted: each record has its own clone and cache, which keeps the model unchanged.
- [`describeRepository` and logs name the repository only] → problems include the content-root-relative path, as today, so a log line reads the same with or without a folder.

## Migration Plan

The user generates the migration (`content_path text not null default ''`); existing rows keep reading from the root. Rollback: drop the column after resetting any non-empty value.
